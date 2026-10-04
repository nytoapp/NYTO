import { DateTime } from "luxon";
import { limits } from "@atlas/config";
import { classifyGuideRequest, ErrorCodes, type ParsedIntent, type SearchRequest, type SearchResponse, type SearchResult } from "@atlas/contracts";
import type { Pool } from "pg";
import { AppError } from "../../shared/http/app-error";
import { logError, timed } from "../../shared/observability/logger";
import { consumerReasons, emptyCatalogFacts, loadCatalogFacts, type CatalogFacts } from "../catalog/facts";
import { signDestinationHandle } from "../destinations/handles";
import { haversineMeters } from "../geo/choose-location";
import { chooseLocation, type LocationCandidate } from "../geo/choose-location";
import { ProviderGateway } from "../providers/gateway";
import { dedupeObservations, type Observation } from "./dedupe";
import { buildCatalogSearchSql, isCatalogKind } from "./query-sql";
import { rankObservations } from "./rank";
import { interpretWithRules } from "./rules-intent";
import { resolveTimeWindow } from "./time-window";

export class SearchService {
  constructor(
    private readonly pool: Pool,
    private readonly gateway: ProviderGateway,
    private readonly destinationSecret: string,
  ) {}

  async search(request: SearchRequest, userId: string | null, requestId: string): Promise<SearchResponse> {
    const guide = classifyGuideRequest(request.query);
    if (guide.searchQuery === null) {
      return {
        results: [],
        interpretation: null,
        resolvedTime: null,
        locationLabel: null,
        relaxed: [],
        notices: [
          {
            code: "GUIDE_HOLD",
            message: guide.message ?? "I can build that once CITYDAY has enough places and experiences in this city.",
          },
        ],
      };
    }
    const intent = interpretWithRules(request.query, request.locale);
    const hasConstraint =
      intent.categorySlugs.length > 0 ||
      intent.kinds.length > 0 ||
      intent.tagSlugs.length > 0 ||
      intent.timeWindow.kind !== "none" ||
      intent.task === "discover";
    if (intent.freeText.length === 0 && !hasConstraint) {
      const openNow = /\bopen now\b/i.test(request.query);
      return {
        results: [],
        interpretation: null,
        resolvedTime: null,
        locationLabel: null,
        relaxed: [],
        notices: [
          openNow
            ? { code: "HOURS_UNKNOWN", message: "CITYDAY does not have opening hours, so open now cannot be applied." }
            : { code: "EMPTY_QUERY", message: "Enter a place, event, or idea." },
        ],
      };
    }
    const located = await timed("search.location", requestId, () => this.resolveLocation(intent, request, userId));
    const zone = located?.timezone ?? "UTC";
    const time = resolveTimeWindow(intent.timeWindow, zone);
    const starts = time.dateFrom ? DateTime.fromISO(time.dateFrom, { zone }).startOf("day") : null;
    const ends = time.dateTo ? DateTime.fromISO(time.dateTo, { zone }).plus({ days: 1 }).startOf("day") : null;
    const sqlInput = buildCatalogSearchSql({
      intent,
      locale: request.locale,
      latitude: located?.latitude ?? null,
      longitude: located?.longitude ?? null,
      startsAfter: starts?.toUTC().toISO() ?? null,
      startsBefore: ends?.toUTC().toISO() ?? null,
    });
    let internal: Observation[] = [];
    let internalFailed = false;
    try {
      internal = await timed("search.catalog", requestId, () => this.catalog(sqlInput.text, sqlInput.values));
    } catch {
      internalFailed = true;
    }
    const providers = await timed("search.providers", requestId, () =>
      this.gateway.search({
        text: intent.freeText || request.query,
        latitude: located?.latitude ?? null,
        longitude: located?.longitude ?? null,
        radiusMeters: intent.radiusMeters,
        locale: request.locale,
      }),
    );
    if (internalFailed && providers.observations.length === 0) {
      throw new AppError(ErrorCodes.SERVICE_UNAVAILABLE, "Search is temporarily unavailable. Try again.", 503, true);
    }
    const deduped = dedupeObservations([...internal, ...providers.observations]);
    const ranked = rankObservations(deduped, {
      freeText: intent.freeText,
      origin: located ? { latitude: located.latitude, longitude: located.longitude } : null,
    }).slice(0, limits.searchResultLimit);
    const notices = [
      ...(internalFailed ? [{ code: "PARTIAL", message: "Some catalog results could not be loaded." }] : []),
      ...providers.warnings.map((warning) => ({ code: warning.code, message: warning.message })),
      ...(/\bopen now\b/i.test(request.query)
        ? [{ code: "HOURS_UNKNOWN", message: "Opening hours are not in CITYDAY, so these places are not filtered by open now." }]
        : []),
    ];
    const ids = ranked.flatMap((item) => (item.subjectId ? [item.subjectId] : []));
    let facts = new Map<string, CatalogFacts>();
    try {
      facts = await loadCatalogFacts(this.pool, ids, request.locale, 1);
    } catch (error) {
      logError("catalog facts unavailable", { name: error instanceof Error ? error.name : "Error" });
    }
    return {
      results: ranked.map((item) => this.present(item, item.subjectId ? facts.get(item.subjectId) : undefined, located)),
      interpretation: intent,
      resolvedTime: time,
      locationLabel: located?.label ?? null,
      relaxed: [],
      notices,
    };
  }

  private present(item: Observation & { reasons: string[] }, facts: CatalogFacts | undefined, origin: { latitude: number; longitude: number } | null): SearchResult {
    const card = facts ?? emptyCatalogFacts();
    const destinationId =
      item.destinationId ??
      (item.destinationLabel
        ? signDestinationHandle({ provider: item.provider, externalId: item.externalId, action: "view_map" }, this.destinationSecret)
        : null);
    const distanceMeters =
      origin && item.latitude !== null && item.longitude !== null
        ? Math.round(haversineMeters(origin, { latitude: item.latitude, longitude: item.longitude }))
        : null;
    return {
      id: item.subjectId ?? `${item.provider}:${item.externalId}`,
      kind: item.kind,
      title: item.title,
      summary: card.summary ?? item.summary,
      factSource: item.factSource,
      provider: item.provider,
      state: item.state,
      attribution: item.attribution,
      location: item.latitude === null || item.longitude === null ? null : { latitude: item.latitude, longitude: item.longitude },
      distanceMeters,
      destination: destinationId && item.destinationLabel ? { id: destinationId, label: item.destinationLabel } : null,
      reasons: consumerReasons(item.reasons),
      locality: card.locality,
      category: card.category,
      images: card.images,
      rating: null,
      reviewCount: null,
      price: card.price,
      tags: card.tags,
      booking: card.booking,
      startsAt: card.startsAt ?? item.startsAt,
    };
  }

  private async catalog(text: string, values: unknown[]): Promise<Observation[]> {
    const result = await this.pool.query(text, values);
    return result.rows.map((row) => {
      const kind = String(row.kind);
      return {
        provider: "catalog",
        externalId: String(row.subject_id),
        subjectId: String(row.subject_id),
        kind: isCatalogKind(kind) ? kind : "place",
        title: String(row.title),
        summary: null,
        latitude: row.latitude === null ? null : Number(row.latitude),
        longitude: row.longitude === null ? null : Number(row.longitude),
        attribution: [],
        confidence: 0.9,
        fetchedAt: new Date().toISOString(),
        expiresAt: null,
        state: "ok" as const,
        destinationId: null,
        destinationLabel: null,
        countryCode: row.country_code ? String(row.country_code).trim() : null,
        categorySlugs: Array.isArray(row.category_slugs) ? row.category_slugs.map(String) : [],
        tagSlugs: Array.isArray(row.tag_slugs) ? row.tag_slugs.map(String) : [],
        startsAt: row.starts_at ? new Date(row.starts_at).toISOString() : null,
        factSource: "catalog" as const,
      };
    });
  }

  private async resolveLocation(intent: ParsedIntent, request: SearchRequest, userId: string | null): Promise<LocationCandidate | null> {
    if (request.context.tripId) {
      if (!userId) {
        throw new AppError(ErrorCodes.AUTHENTICATION_REQUIRED, "Sign in to continue.", 401);
      }
      const trip = await this.pool.query(
        `select l.id, l.label, l.country_code, l.timezone, ST_Y(l.geog::geometry) as latitude, ST_X(l.geog::geometry) as longitude
         from trips t join resolved_locations l on l.id = t.destination_location_id
         where t.id = $1 and t.owner_user_id = $2 and t.deleted_at is null`,
        [request.context.tripId, userId],
      );
      return mapLocation(trip.rows[0]);
    }
    if (intent.location.mode === "text" && intent.location.text) {
      const found = await this.pool.query(
        `select id, label, country_code, timezone, ST_Y(geog::geometry) as latitude, ST_X(geog::geometry) as longitude
         from resolved_locations where label ilike $1 limit 8`,
        [intent.location.text],
      );
      const bias = request.context.selectedLocationId
        ? await this.pool.query("select country_code from resolved_locations where id = $1", [request.context.selectedLocationId])
        : null;
      const choice = chooseLocation(
        found.rows.map(mapRequired),
        bias?.rows[0] ? String(bias.rows[0].country_code).trim() : null,
      );
      if (choice.type === "ambiguous") {
        throw new AppError(ErrorCodes.AMBIGUOUS_LOCATION, "Which place did you mean?", 422, false, {
          candidates: choice.candidates,
        });
      }
      return choice.type === "one" ? choice.location : null;
    }
    if (request.context.selectedLocationId) {
      const selected = await this.pool.query(
        `select id, label, country_code, timezone, ST_Y(geog::geometry) as latitude, ST_X(geog::geometry) as longitude
         from resolved_locations where id = $1`,
        [request.context.selectedLocationId],
      );
      return mapLocation(selected.rows[0]);
    }
    if (intent.location.mode === "near_me" && request.context.device) {
      return {
        id: "device",
        label: "Current location",
        countryCode: "",
        timezone: "UTC",
        latitude: request.context.device.latitude,
        longitude: request.context.device.longitude,
      };
    }
    return null;
  }
}

function mapLocation(row: Record<string, unknown> | undefined): LocationCandidate | null {
  if (!row) {
    return null;
  }
  return mapRequired(row);
}

function mapRequired(row: Record<string, unknown>): LocationCandidate {
  return {
    id: String(row.id),
    label: String(row.label),
    countryCode: String(row.country_code).trim(),
    timezone: String(row.timezone),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
  };
}
