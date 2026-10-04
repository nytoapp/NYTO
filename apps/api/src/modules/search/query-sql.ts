import { limits } from "@atlas/config";
import type { CatalogKind, ParsedIntent } from "@atlas/contracts";

const LANGUAGE_CONFIG: Record<string, string> = {
  en: "english",
  fr: "french",
  de: "german",
  es: "spanish",
  pt: "portuguese",
  it: "italian",
};

export type SearchSql = { text: string; values: unknown[] };

export function buildCatalogSearchSql(input: {
  intent: ParsedIntent;
  startsAfter: string | null;
  startsBefore: string | null;
  latitude: number | null;
  longitude: number | null;
  locale: string;
}): SearchSql {
  const values: unknown[] = [];
  const bind = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  const config = LANGUAGE_CONFIG[input.locale.slice(0, 2)] ?? "simple";
  const like = `%${escapeLike(input.intent.freeText)}%`;
  const locale = bind(input.locale);
  const queryConfig = bind(config);
  const freeText = bind(input.intent.freeText);
  const likeParam = bind(like);
  const kinds = bind(input.intent.kinds);
  const categories = bind(input.intent.categorySlugs);
  const longitude = bind(input.longitude);
  const latitude = bind(input.latitude);
  const radius = bind(input.intent.radiusMeters ?? limits.defaultRadiusMeters);
  const startsAfter = bind(input.startsAfter);
  const startsBefore = bind(input.startsBefore);
  const limit = bind(limits.searchResultLimit);

  const text = `
    SELECT d.subject_id, d.occurrence_id, d.kind, d.title, d.country_code, d.starts_at,
           d.category_slugs, d.tag_slugs,
           ST_Y(d.geog::geometry) AS latitude,
           ST_X(d.geog::geometry) AS longitude
    FROM search_documents d
    JOIN catalog_subjects s ON s.id = d.subject_id AND s.deleted_at IS NULL AND s.status = 'active'
    WHERE d.locale = ${locale}
      AND (
        ${freeText} = ''
        OR d.search_vector @@ websearch_to_tsquery(${queryConfig}::regconfig, ${freeText})
        OR d.title ILIKE ${likeParam}
      )
      AND (cardinality(${kinds}::text[]) = 0 OR d.kind = ANY(${kinds}::text[]))
      AND (cardinality(${categories}::text[]) = 0 OR d.category_slugs @> ${categories}::text[])
      AND (
        ${longitude}::float8 IS NULL
        OR d.geog IS NULL
        OR ST_DWithin(d.geog, ST_SetSRID(ST_MakePoint(${longitude}::float8, ${latitude}::float8), 4326)::geography, ${radius}::float8)
      )
      AND (
        ${startsAfter}::timestamptz IS NULL
        OR d.starts_at IS NULL
        OR (d.starts_at >= ${startsAfter}::timestamptz AND d.starts_at < ${startsBefore}::timestamptz)
      )
    LIMIT ${limit}
  `;
  assertBound(text, input.intent.freeText);
  return { text, values };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function assertBound(sql: string, freeText: string): void {
  if ((freeText.includes("'") || freeText.includes(";") || /drop/i.test(freeText)) && sql.includes(freeText)) {
    throw new Error("Search text was interpolated into SQL");
  }
}

export function isCatalogKind(value: string): value is CatalogKind {
  return ["place", "accommodation", "event", "experience", "activity", "media"].includes(value);
}
