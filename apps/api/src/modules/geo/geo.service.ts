import type { Pool } from "pg";
import { chooseLocation, type LocationCandidate } from "./choose-location";
import { ErrorCodes } from "@atlas/contracts";
import { AppError } from "../../shared/http/app-error";

export class GeoService {
  constructor(private readonly pool: Pool) {}

  async suggest(query: string, countryCode: string | null): Promise<LocationCandidate[]> {
    const result = await this.pool.query(
      `select id, label, country_code, timezone, ST_Y(geog::geometry) as latitude, ST_X(geog::geometry) as longitude
       from resolved_locations
       where label ilike $1 and ($2::text is null or country_code = $2)
       order by label
       limit 8`,
      [`${query}%`, countryCode],
    );
    return result.rows.map(mapRow);
  }

  async resolve(query: string, countryCode: string | null): Promise<LocationCandidate> {
    const candidates = await this.suggest(query, null);
    const choice = chooseLocation(candidates, countryCode);
    if (choice.type === "none") {
      throw new AppError(ErrorCodes.NOT_FOUND, "No matching place.", 404);
    }
    if (choice.type === "ambiguous") {
      throw new AppError(ErrorCodes.AMBIGUOUS_LOCATION, "Which place did you mean?", 422, false, { candidates: choice.candidates });
    }
    return choice.location;
  }
}

function mapRow(row: Record<string, unknown>): LocationCandidate {
  return {
    id: String(row.id),
    label: String(row.label),
    countryCode: String(row.country_code).trim(),
    timezone: String(row.timezone),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
  };
}
