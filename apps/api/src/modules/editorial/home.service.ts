import type { Pool } from "pg";
import type { HomeResponse } from "@atlas/contracts";
import { emptyCatalogFacts, loadCatalogFacts, type CatalogFacts } from "../catalog/facts";
import { haversineMeters } from "../geo/choose-location";
import { logError } from "../../shared/observability/logger";

/** Home reads the catalog only. It does not call provider adapters. */
export class HomeService {
  constructor(private readonly pool: Pool) {}

  async load(selectedLocationId: string | null, locale: string): Promise<HomeResponse> {
    const location = selectedLocationId
      ? await this.pool.query(
          "select label, country_code, timezone, ST_Y(geog::geometry) as latitude, ST_X(geog::geometry) as longitude from resolved_locations where id = $1",
          [selectedLocationId],
        )
      : null;
    const country = location?.rows[0] ? String(location.rows[0].country_code).trim() : null;
    const origin =
      location?.rows[0] && location.rows[0].latitude !== null
        ? { latitude: Number(location.rows[0].latitude), longitude: Number(location.rows[0].longitude) }
        : null;
    const items = await this.pool.query(
      `select d.subject_id, d.kind, d.title, ST_Y(d.geog::geometry) as latitude, ST_X(d.geog::geometry) as longitude
       from search_documents d
       join catalog_subjects s on s.id = d.subject_id and s.deleted_at is null and s.status = 'active'
       where d.locale = $1 and d.occurrence_id is null and ($2::text is null or d.country_code = $2)
       order by d.title
       limit 6`,
      [locale, country],
    );
    let facts = new Map<string, CatalogFacts>();
    try {
      facts = await loadCatalogFacts(
        this.pool,
        items.rows.map((row) => String(row.subject_id)),
        locale,
        1,
      );
    } catch (error) {
      logError("catalog facts unavailable", { name: error instanceof Error ? error.name : "Error" });
    }
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
          title: location?.rows[0] ? `In ${String(location.rows[0].label)}` : "Places to start",
          items: items.rows.map((row) => {
            const card = facts.get(String(row.subject_id)) ?? emptyCatalogFacts();
            const point =
              row.latitude === null || row.longitude === null ? null : { latitude: Number(row.latitude), longitude: Number(row.longitude) };
            return {
              id: String(row.subject_id),
              kind: row.kind as HomeResponse["rails"][number]["items"][number]["kind"],
              title: String(row.title),
              summary: card.summary,
              factSource: "catalog" as const,
              provider: null,
              state: "ok" as const,
              attribution: [],
              location: point,
              distanceMeters: origin && point ? Math.round(haversineMeters(origin, point)) : null,
              destination: null,
              reasons: [],
              locality: card.locality,
              category: card.category,
              images: card.images,
              rating: null,
              reviewCount: null,
              price: card.price,
              tags: card.tags,
              booking: card.booking,
              startsAt: card.startsAt,
            };
          }),
        },
      ],
    };
  }
}
