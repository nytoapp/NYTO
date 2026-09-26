import type { PlaceListQuery } from "@atlas/contracts";

const SORTS = {
  created_at: "s.created_at",
  updated_at: "s.updated_at",
  name: "t.name",
} as const;

export function buildPlaceListSql(query: PlaceListQuery): {
  text: string;
  values: unknown[];
  countText: string;
  countValues: unknown[];
} {
  const values: unknown[] = [];
  const bind = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  const where = ["s.kind = 'place'"];
  if (!query.includeArchived && query.status !== "deleted") {
    where.push("s.deleted_at IS NULL");
  }
  if (query.status) {
    where.push(`s.status = ${bind(query.status)}`);
  }
  if (query.countryCode) {
    where.push(`p.country_code = ${bind(query.countryCode.toUpperCase())}`);
  }
  if (query.locality) {
    where.push(`p.locality ILIKE ${bind(`%${escapeLike(query.locality)}%`)} ESCAPE E'\\\\'`);
  }
  if (query.q) {
    where.push(`t.name ILIKE ${bind(`%${escapeLike(query.q)}%`)} ESCAPE E'\\\\'`);
  }
  if (query.categoryId) {
    where.push(
      `exists (select 1 from subject_categories sc where sc.subject_id = s.id and sc.category_id = ${bind(query.categoryId)}::uuid)`,
    );
  }
  const sort = SORTS[query.sort];
  const direction = query.direction === "asc" ? "ASC" : "DESC";
  const whereSql = where.join(" AND ");
  const countValues = [...values];
  const limit = bind(query.limit);
  const offset = bind(query.offset);
  const text = `
    SELECT s.id, coalesce(t.name, 'Untitled') AS name, s.status, s.updated_at,
           p.locality, p.country_code,
           (SELECT ct.name FROM subject_categories sc
             JOIN categories c ON c.id = sc.category_id
             LEFT JOIN category_translations ct ON ct.category_id = c.id AND ct.locale = 'en'
             WHERE sc.subject_id = s.id AND sc.is_primary
             LIMIT 1) AS category
    FROM catalog_subjects s
    JOIN places p ON p.subject_id = s.id
    LEFT JOIN subject_translations t ON t.subject_id = s.id AND t.locale = s.default_locale
    WHERE ${whereSql}
    ORDER BY ${sort} ${direction}, s.id ${direction}
    LIMIT ${limit} OFFSET ${offset}`;
  const countText = `
    SELECT count(*)::int AS total
    FROM catalog_subjects s
    JOIN places p ON p.subject_id = s.id
    LEFT JOIN subject_translations t ON t.subject_id = s.id AND t.locale = s.default_locale
    WHERE ${whereSql}`;
  assertBound(text, query.q ?? "");
  return { text, values, countText, countValues };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function assertBound(sql: string, freeText: string): void {
  if (freeText && (freeText.includes("'") || freeText.includes(";")) && sql.includes(freeText)) {
    throw new Error("Place search text was interpolated into SQL");
  }
}
