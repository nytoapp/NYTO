import type { Pool } from "pg";
import type { HomeResponse } from "@atlas/contracts";

/** Home reads the catalog only. It does not call provider adapters. */
export class HomeService {
  constructor(private readonly pool: Pool) {}

  async load(selectedLocationId: string | null, locale: string): Promise<HomeResponse> {
    const location = selectedLocationId
      ? await this.pool.query("select label, country_code, timezone from resolved_locations where id = $1", [selectedLocationId])
      : null;
    const country = location?.rows[0] ? String(location.rows[0].country_code).trim() : null;
    const items = await this.pool.query(
      `select d.subject_id, d.kind, d.title, ST_Y(d.geog::geometry) as latitude, ST_X(d.geog::geometry) as longitude
       from search_documents d
       join catalog_subjects s on s.id = d.subject_id and s.deleted_at is null and s.status = 'active'
       where d.locale = $1 and d.occurrence_id is null and ($2::text is null or d.country_code = $2)
       order by d.title
       limit 6`,
      [locale, country],
    );
    const explore = await this.pool.query(
      `select c.slug, ct.name from categories c
       join category_translations ct on ct.category_id = c.id and ct.locale = 'en'
       where c.deleted_at is null and c.status = 'active'
       order by c.sort_order limit 6`,
    );
    return {
      locationLabel: location?.rows[0] ? String(location.rows[0].label) : null,
      timezone: location?.rows[0] ? String(location.rows[0].timezone) : null,
      explore: explore.rows.map((row) => ({ slug: String(row.slug), label: String(row.name) })),
      rails: [
        {
          key: "popular_nearby",
          title: country ? "Popular nearby" : "Places to start",
          items: items.rows.map((row) => ({
            id: String(row.subject_id),
            kind: row.kind as HomeResponse["rails"][number]["items"][number]["kind"],
            title: String(row.title),
            summary: null,
            factSource: "catalog" as const,
            provider: null,
            state: "ok" as const,
            attribution: [],
            location:
              row.latitude === null || row.longitude === null
                ? null
                : { latitude: Number(row.latitude), longitude: Number(row.longitude) },
            distanceMeters: null,
            destination: null,
            reasons: [],
          })),
        },
      ],
    };
  }
}
