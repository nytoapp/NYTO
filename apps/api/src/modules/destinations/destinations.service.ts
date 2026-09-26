import { ErrorCodes } from "@atlas/contracts";
import type { Pool } from "pg";
import { AppError } from "../../shared/http/app-error";
import { readDestinationHandle } from "./handles";
import { validateDestinationUrl } from "./url-policy";
import type { ProviderAdapter } from "../providers/gateway";

export class DestinationsService {
  constructor(
    private readonly pool: Pool,
    private readonly secret: string,
    private readonly adapters: ProviderAdapter[],
  ) {}

  async resolve(destinationId: string): Promise<{ label: string; preferredUrl: string; fallbackUrl: string }> {
    if (destinationId.includes(".")) {
      const handle = readDestinationHandle(destinationId, this.secret);
      if (!handle) {
        throw new AppError(ErrorCodes.DESTINATION_EXPIRED, "That link expired. Open the place again.", 410);
      }
      const adapter = this.adapters.find((item) => item.code === handle.provider);
      const built = adapter ? await adapter.buildDestination({ externalId: handle.externalId, action: handle.action }, AbortSignal.timeout(800)) : null;
      if (!built) {
        throw new AppError(ErrorCodes.DESTINATION_REJECTED, "That link is not available.", 422);
      }
      return this.accept(built.label, built.preferredUrl, built.fallbackUrl, built.allowedHosts, built.allowedSchemes);
    }
    const result = await this.pool.query(
      `select label, preferred_url, fallback_url, allowed_hosts, allowed_schemes, status
       from external_destinations where id = $1`,
      [destinationId],
    );
    const row = result.rows[0] as
      | { label: string; preferred_url: string | null; fallback_url: string | null; allowed_hosts: string[]; allowed_schemes: string[]; status: string }
      | undefined;
    if (!row || row.status !== "active" || !row.preferred_url || !row.fallback_url) {
      throw new AppError(ErrorCodes.DESTINATION_REJECTED, "That link is not available.", 422);
    }
    return this.accept(row.label, row.preferred_url, row.fallback_url, row.allowed_hosts, row.allowed_schemes);
  }

  private accept(label: string, preferred: string, fallback: string, hosts: string[], schemes: string[]) {
    const primary = validateDestinationUrl(preferred, hosts, schemes);
    const secondary = validateDestinationUrl(fallback, hosts, schemes);
    if (!primary.ok || !secondary.ok) {
      throw new AppError(ErrorCodes.DESTINATION_REJECTED, "That link is not available.", 422);
    }
    return { label, preferredUrl: primary.href, fallbackUrl: secondary.href };
  }
}
