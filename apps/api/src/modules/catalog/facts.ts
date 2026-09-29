import {
  catalogBookingSchema,
  catalogPriceSchema,
  subjectDetailSchema,
  type CatalogKind,
  type SearchResult,
  type SubjectDetail,
} from "@atlas/contracts";
import type { Pool } from "pg";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CatalogFacts = Pick<
  SearchResult,
  "locality" | "category" | "images" | "rating" | "reviewCount" | "price" | "tags" | "booking" | "startsAt" | "summary"
>;

export function emptyCatalogFacts(): CatalogFacts {
  return {
    locality: null,
    category: null,
    images: [],
    rating: null,
    reviewCount: null,
    price: null,
    tags: [],
    booking: { capability: "unavailable", destinationId: null, label: null },
    startsAt: null,
    summary: null,
  };
}

export function publicImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 500) {
    return null;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

export function readPrice(amount: unknown, currency: unknown, basis: unknown): CatalogFacts["price"] {
  const parsed = catalogPriceSchema.safeParse({
    amountMinor: typeof amount === "number" ? amount : Number(amount),
    currency: typeof currency === "string" ? currency.trim().toUpperCase() : currency,
    basis,
  });
  return parsed.success ? parsed.data : null;
}

export function readBooking(value: unknown): CatalogFacts["booking"] {
  if (!value || typeof value !== "object") {
    return emptyCatalogFacts().booking;
  }
  const row = value as { id?: unknown; type?: unknown; label?: unknown };
  const parsed = catalogBookingSchema.safeParse({
    capability: row.type,
    destinationId: typeof row.id === "string" ? row.id : null,
    label: typeof row.label === "string" && row.label.trim().length > 0 ? row.label.trim() : null,
  });
  if (!parsed.success || parsed.data.capability === "unavailable" || !parsed.data.destinationId || !UUID.test(parsed.data.destinationId)) {
    return emptyCatalogFacts().booking;
  }
  return parsed.data;
}

export function readImages(value: unknown): CatalogFacts["images"] {
  if (!Array.isArray(value)) {
    return [];
  }
  const images: CatalogFacts["images"] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const row = item as { url?: unknown; alt?: unknown; position?: unknown };
    const url = publicImageUrl(row.url);
    const position = typeof row.position === "number" ? row.position : Number(row.position);
    if (!url || !Number.isInteger(position) || position < 0) {
      continue;
    }
    images.push({ url, alt: typeof row.alt === "string" && row.alt.trim() ? row.alt.trim() : null, position });
    if (images.length === 8) {
      break;
    }
  }
  return images;
}

export function consumerReasons(reasons: string[]): string[] {
  return reasons.includes("nearby") ? ["Nearby"] : [];
}

export async function loadCatalogFacts(pool: Pool, ids: string[], locale: string, imageLimit: number): Promise<Map<string, CatalogFacts>> {
  const unique = [...new Set(ids.filter((id) => UUID.test(id)))];
  const found = new Map<string, CatalogFacts>();
  if (unique.length === 0) {
    return found;
  }
  const limit = Math.min(Math.max(imageLimit, 1), 8);
  const result = await pool.query(
    `select s.id::text as id,
            p.locality,
            tr.summary,
            cat.name as category,
            coalesce(tags.names, '[]'::json) as tags,
            coalesce(media.items, '[]'::json) as images,
            p.price_amount_minor,
            p.price_currency,
            p.price_basis,
            dest.destination,
            occ.starts_at
     from catalog_subjects s
     left join places p on p.subject_id = s.id
     left join subject_translations tr on tr.subject_id = s.id and tr.locale = $2
     left join lateral (
       select ct.name
       from subject_categories sc
       join category_translations ct on ct.category_id = sc.category_id and ct.locale = $2
       where sc.subject_id = s.id and sc.is_primary
       limit 1
     ) cat on true
     left join lateral (
       select json_agg(tt.name order by tt.name) as names
       from subject_tags st
       join tags t on t.id = st.tag_id and t.deleted_at is null and t.status = 'active'
       join tag_translations tt on tt.tag_id = t.id and tt.locale = $2
       where st.subject_id = s.id
     ) tags on true
     left join lateral (
       select json_agg(json_build_object('url', picked.url, 'alt', picked.alt, 'position', picked.position) order by picked.position) as items
       from (
         select url, alt, position from subject_media where subject_id = s.id order by position limit $3
       ) picked
     ) media on true
     left join lateral (
       select json_build_object('id', d.id, 'type', d.destination_type, 'label', d.label) as destination
       from external_destinations d
       where d.subject_id = s.id
         and d.status = 'active'
         and d.preferred_url is not null
         and (d.expires_at is null or d.expires_at > clock_timestamp())
       order by case d.destination_type
         when 'book' then 0
         when 'tickets' then 1
         when 'website' then 2
         when 'view_provider' then 3
         when 'directions' then 4
         when 'view_map' then 5
         else 6
       end
       limit 1
     ) dest on true
     left join lateral (
       select o.starts_at
       from event_occurrences o
       where o.event_subject_id = s.id and o.deleted_at is null and o.status = 'scheduled'
       order by o.starts_at
       limit 1
     ) occ on true
     where s.id = any($1::uuid[]) and s.deleted_at is null and s.status = 'active'`,
    [unique, locale, limit],
  );
  for (const row of result.rows) {
    const tags = Array.isArray(row.tags) ? row.tags.filter((tag: unknown) => typeof tag === "string").slice(0, 8) : [];
    found.set(String(row.id), {
      locality: row.locality ? String(row.locality) : null,
      category: row.category ? String(row.category) : null,
      images: readImages(row.images),
      rating: null,
      reviewCount: null,
      price: readPrice(row.price_amount_minor, row.price_currency, row.price_basis),
      tags,
      booking: readBooking(row.destination),
      startsAt: row.starts_at ? new Date(row.starts_at).toISOString() : null,
      summary: row.summary ? String(row.summary) : null,
    });
  }
  return found;
}

export async function loadSubjectDetail(pool: Pool, id: string, locale: string): Promise<SubjectDetail | null> {
  if (!UUID.test(id)) {
    return null;
  }
  const result = await pool.query(
    `select s.id, s.kind, t.name, t.summary, p.country_code, p.timezone, p.locality, p.phone_e164,
            ST_Y(p.geog::geometry) as latitude, ST_X(p.geog::geometry) as longitude,
            occ.starts_at, occ.ends_at
     from catalog_subjects s
     left join subject_translations t on t.subject_id = s.id and t.locale = $2
     left join places p on p.subject_id = s.id
     left join lateral (
       select o.starts_at, o.ends_at
       from event_occurrences o
       where o.event_subject_id = s.id and o.deleted_at is null and o.status = 'scheduled'
       order by o.starts_at
       limit 1
     ) occ on true
     where s.id = $1 and s.deleted_at is null and s.status = 'active'`,
    [id, locale],
  );
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  const facts = await loadCatalogFacts(pool, [id], locale, 8);
  const card = facts.get(id) ?? emptyCatalogFacts();
  const hours = await pool.query(
    `select weekday, to_char(opens_local, 'HH24:MI') as opens, to_char(closes_local, 'HH24:MI') as closes
     from place_hours where place_subject_id = $1 order by weekday, opens_local`,
    [id],
  );
  const phone = typeof row.phone_e164 === "string" && /^\+[1-9]\d{7,14}$/.test(row.phone_e164) ? row.phone_e164 : null;
  return subjectDetailSchema.parse({
    id: String(row.id),
    kind: row.kind as CatalogKind,
    title: row.name ? String(row.name) : "Untitled",
    summary: row.summary ? String(row.summary) : card.summary,
    locale,
    countryCode: row.country_code ? String(row.country_code).trim() : null,
    timezone: row.timezone ? String(row.timezone) : null,
    location: row.latitude === null || row.longitude === null ? null : { latitude: Number(row.latitude), longitude: Number(row.longitude) },
    factSource: "catalog",
    attribution: [],
    locality: card.locality ?? (row.locality ? String(row.locality) : null),
    category: card.category,
    images: card.images,
    rating: null,
    reviewCount: null,
    price: card.price,
    tags: card.tags,
    booking: card.booking,
    startsAt: row.starts_at ? new Date(row.starts_at).toISOString() : card.startsAt,
    endsAt: row.ends_at ? new Date(row.ends_at).toISOString() : null,
    phone,
    hours: hours.rows
      .map((hour) => ({ weekday: Number(hour.weekday), opens: String(hour.opens), closes: String(hour.closes) }))
      .filter((hour) => hour.opens.length === 5 && hour.closes.length === 5),
  });
}
