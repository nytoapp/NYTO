import { Injectable } from "@nestjs/common";
import { DateTime } from "luxon";
import type { PlaceCategoryOption, PlaceDetail, PlaceListQuery, PlaceListResponse, PlaceWrite } from "@atlas/contracts";
import { ErrorCodes } from "@atlas/contracts";
import type { Pool, PoolClient } from "pg";
import { Database } from "../../shared/db/database";
import { AppError } from "../../shared/http/app-error";
import { buildPlaceListSql } from "./places.list-sql";
import { placeTransition, statusAfterWrite } from "./places.transitions";
import { assertPublicHttps, isUniqueViolation } from "./places.urls";

type Sql = Pick<Pool | PoolClient, "query">;

@Injectable()
export class PlacesAdminService {
  constructor(private readonly database: Database) {}

  async list(query: PlaceListQuery): Promise<PlaceListResponse> {
    const sql = buildPlaceListSql(query);
    const [rows, count] = await Promise.all([
      this.database.pool.query(sql.text, sql.values),
      this.database.pool.query(sql.countText, sql.countValues),
    ]);
    return {
      items: rows.rows.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        status: row.status,
        category: row.category ? String(row.category) : null,
        locality: row.locality ? String(row.locality) : null,
        countryCode: String(row.country_code).trim(),
        updatedAt: new Date(row.updated_at).toISOString(),
      })),
      total: Number(count.rows[0]?.total ?? 0),
      limit: query.limit,
      offset: query.offset,
    };
  }

  async categories(): Promise<PlaceCategoryOption[]> {
    const result = await this.database.pool.query(
      `select c.id, c.slug, c.parent_id, coalesce(ct.name, c.slug) as name
       from categories c
       left join category_translations ct on ct.category_id = c.id and ct.locale = 'en'
       where c.deleted_at is null and c.status = 'active'
         and (c.kind_affinity is null or c.kind_affinity in ('place', 'accommodation'))
       order by c.sort_order, name`,
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      slug: String(row.slug),
      name: String(row.name),
      parentId: row.parent_id ? String(row.parent_id) : null,
    }));
  }

  async countries(): Promise<{ code: string; currency: string }[]> {
    const result = await this.database.pool.query(`select iso_code, default_currency from countries order by iso_code`);
    return result.rows.map((row) => ({ code: String(row.iso_code).trim(), currency: String(row.default_currency).trim() }));
  }

  async currencies(): Promise<string[]> {
    const result = await this.database.pool.query(`select code from currency_codes order by code`);
    return result.rows.map((row) => String(row.code).trim());
  }

  async tags(): Promise<{ id: string; name: string }[]> {
    const result = await this.database.pool.query(
      `select t.id, coalesce(tt.name, t.slug) as name
       from tags t
       left join tag_translations tt on tt.tag_id = t.id and tt.locale = 'en'
       where t.status = 'active' and t.deleted_at is null
       order by name`,
    );
    return result.rows.map((row) => ({ id: String(row.id), name: String(row.name) }));
  }

  async providers(): Promise<{ code: string; name: string }[]> {
    const result = await this.database.pool.query(
      `select code, display_name from providers where status = 'active' order by display_name`,
    );
    return result.rows.map((row) => ({ code: String(row.code), name: String(row.display_name) }));
  }

  async get(id: string): Promise<PlaceDetail> {
    return this.read(this.database.pool, id);
  }

  async create(input: PlaceWrite, actorUserId: string, requestId: string): Promise<PlaceDetail> {
    return this.transaction(async (client) => {
      await this.assertReferences(client, input);
      const subject = await client.query(
        `insert into catalog_subjects (kind, status, default_locale) values ('place', $1, $2) returning id`,
        [input.status, input.locale],
      );
      const id = String(subject.rows[0].id);
      await this.writeBody(client, id, input);
      await this.projectSearch(client, id);
      await this.audit(client, actorUserId, requestId, "place.created", id);
      return id;
    });
  }

  async update(id: string, input: PlaceWrite, actorUserId: string, requestId: string): Promise<PlaceDetail> {
    return this.transaction(async (client) => {
      const existing = await client.query(`select status, deleted_at from catalog_subjects where id = $1 and kind = 'place' for update`, [id]);
      if (!existing.rows[0]) {
        throw new AppError(ErrorCodes.NOT_FOUND, "That place was not found.", 404);
      }
      await this.assertReferences(client, input);
      const archived = existing.rows[0].deleted_at !== null;
      await client.query(
        `update catalog_subjects
         set status = $2, default_locale = $3, updated_at = clock_timestamp()
         where id = $1`,
        [id, statusAfterWrite(archived, input.status), input.locale],
      );
      await client.query(`delete from subject_translations where subject_id = $1 and locale <> $2`, [id, input.locale]);
      await client.query(
        `delete from search_documents where subject_id = $1 and occurrence_id is null and locale <> $2`,
        [id, input.locale],
      );
      await client.query(`delete from subject_categories where subject_id = $1`, [id]);
      await client.query(`delete from subject_tags where subject_id = $1`, [id]);
      await client.query(`delete from place_hours where place_subject_id = $1`, [id]);
      await client.query(`delete from subject_media where subject_id = $1`, [id]);
      await client.query(`delete from external_destinations where subject_id = $1 and destination_type = 'website'`, [id]);
      await this.writeBody(client, id, input, true);
      await this.projectSearch(client, id);
      await this.audit(client, actorUserId, requestId, "place.updated", id);
      return id;
    });
  }

  async archive(id: string, actorUserId: string, requestId: string): Promise<PlaceDetail> {
    return this.transition(id, actorUserId, requestId, "archive");
  }

  async restore(id: string, actorUserId: string, requestId: string): Promise<PlaceDetail> {
    return this.transition(id, actorUserId, requestId, "restore");
  }

  private async transition(id: string, actorUserId: string, requestId: string, action: "archive" | "restore"): Promise<PlaceDetail> {
    return this.transaction(async (client) => {
      const existing = await client.query(`select deleted_at from catalog_subjects where id = $1 and kind = 'place' for update`, [id]);
      if (!existing.rows[0]) {
        throw new AppError(ErrorCodes.NOT_FOUND, "That place was not found.", 404);
      }
      const decision = placeTransition(action, existing.rows[0].deleted_at !== null);
      if ("conflict" in decision) {
        throw new AppError(ErrorCodes.CONFLICT, "This place is not archived.", 409);
      }
      if (decision.apply) {
        if (decision.status === "deleted") {
          await client.query(
            `update catalog_subjects set status = 'deleted', deleted_at = clock_timestamp(), updated_at = clock_timestamp() where id = $1`,
            [id],
          );
          await this.audit(client, actorUserId, requestId, "place.archived", id);
        } else {
          await client.query(
            `update catalog_subjects set status = 'draft', deleted_at = null, updated_at = clock_timestamp() where id = $1`,
            [id],
          );
          await this.audit(client, actorUserId, requestId, "place.restored", id);
        }
      }
      return id;
    });
  }

  private async writeBody(client: Sql, id: string, input: PlaceWrite, updating = false): Promise<void> {
    const website = input.websiteUrl ? assertPublicHttps(input.websiteUrl, "websiteUrl") : null;
    if (!updating) {
      await client.query(
        `insert into subject_translations (subject_id, locale, name, summary) values ($1, $2, $3, $4)`,
        [id, input.locale, input.name, input.summary ?? null],
      );
      await client.query(
        `insert into places (
           subject_id, geog, country_code, timezone, street_line, locality, admin_area, postal_code, phone_e164, website_host,
           attributes, price_amount_minor, price_currency, price_basis
         ) values (
           $1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4, $5, $6, $7, $8, $9, $10, $11,
           $12::jsonb, $13, $14, $15
         )`,
        placeParams(id, input, website),
      );
    } else {
      await client.query(
        `insert into subject_translations (subject_id, locale, name, summary) values ($1, $2, $3, $4)
         on conflict (subject_id, locale) do update set name = excluded.name, summary = excluded.summary`,
        [id, input.locale, input.name, input.summary ?? null],
      );
      await client.query(
        `update places set
           geog = ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
           country_code = $4, timezone = $5, street_line = $6, locality = $7, admin_area = $8, postal_code = $9,
           phone_e164 = $10, website_host = $11, attributes = $12::jsonb,
           price_amount_minor = $13, price_currency = $14, price_basis = $15
         where subject_id = $1`,
        placeParams(id, input, website),
      );
    }
    await client.query(`insert into subject_categories (subject_id, category_id, is_primary) values ($1, $2, true)`, [id, input.categoryId]);
    if (input.subcategoryId) {
      await client.query(`insert into subject_categories (subject_id, category_id, is_primary) values ($1, $2, false)`, [id, input.subcategoryId]);
    }
    for (const tagId of input.tagIds) {
      await client.query(`insert into subject_tags (subject_id, tag_id) values ($1, $2)`, [id, tagId]);
    }
    for (const hour of input.hours) {
      await client.query(
        `insert into place_hours (place_subject_id, weekday, opens_local, closes_local, spans_next_day) values ($1, $2, $3, $4, $5)`,
        [id, hour.weekday, hour.opensLocal, hour.closesLocal, hour.spansNextDay],
      );
    }
    for (const [position, item] of input.media.entries()) {
      await client.query(`insert into subject_media (subject_id, position, alt, url) values ($1, $2, $3, $4)`, [
        id,
        position,
        item.alt ?? null,
        assertPublicHttps(item.url, "media"),
      ]);
    }
    if (website) {
      const provider = await this.catalogProvider(client);
      const host = new URL(website).hostname;
      await client.query(
        `insert into external_destinations (
           provider_id, subject_id, destination_type, allowed_hosts, allowed_schemes, preferred_url, fallback_url, label, status
         ) values ($1, $2, 'website', $3, ARRAY['https']::text[], $4, $4, 'Website', 'active')`,
        [provider, id, [host], website],
      );
    }
    if (input.providerReference) {
      const provider = await client.query(`select id from providers where code = $1 and status = 'active'`, [input.providerReference.providerCode]);
      if (!provider.rows[0]) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, "That provider is not registered.", 422, false, { fields: ["providerReference"] });
      }
      try {
        await client.query(
          `insert into external_references (provider_id, subject_id, external_id, confidence, match_method)
           values ($1, $2, $3, 1, 'admin')`,
          [provider.rows[0].id, id, input.providerReference.externalId],
        );
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AppError(ErrorCodes.CONFLICT, "That provider identity is already linked.", 409);
        }
        throw error;
      }
    }
  }

  private async assertReferences(client: Sql, input: PlaceWrite): Promise<void> {
    if (!DateTime.now().setZone(input.timezone).isValid) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, "Use an IANA timezone.", 422, false, { fields: ["timezone"] });
    }
    const country = await client.query(`select 1 from countries where iso_code = $1`, [input.countryCode.toUpperCase()]);
    if (!country.rowCount) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, "Choose a known country.", 422, false, { fields: ["countryCode"] });
    }
    const category = await this.category(client, input.categoryId);
    if (!category || category.parent_id) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, "Choose a top-level category.", 422, false, { fields: ["categoryId"] });
    }
    if (input.subcategoryId) {
      const sub = await this.category(client, input.subcategoryId);
      if (!sub || sub.parent_id !== input.categoryId) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, "Subcategory must belong to the selected category.", 422, false, { fields: ["subcategoryId"] });
      }
    }
    if (input.tagIds.length > 0) {
      const tags = await client.query(
        `select count(*)::int as total from tags where id = any($1::uuid[]) and status = 'active' and deleted_at is null`,
        [input.tagIds],
      );
      if (Number(tags.rows[0].total) !== input.tagIds.length) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, "One or more tags are not available.", 422, false, { fields: ["tagIds"] });
      }
    }
    if (input.price) {
      const currency = await client.query(`select 1 from currency_codes where code = $1`, [input.price.currency]);
      if (!currency.rowCount) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, "Choose a known currency.", 422, false, { fields: ["price"] });
      }
    }
    if (input.websiteUrl) {
      assertPublicHttps(input.websiteUrl, "websiteUrl");
    }
    for (const item of input.media) {
      assertPublicHttps(item.url, "media");
    }
  }

  private async category(client: Sql, id: string): Promise<{ parent_id: string | null } | null> {
    const result = await client.query(
      `select parent_id from categories
       where id = $1 and deleted_at is null and status = 'active'
         and (kind_affinity is null or kind_affinity in ('place', 'accommodation'))`,
      [id],
    );
    const row = result.rows[0];
    return row ? { parent_id: row.parent_id ? String(row.parent_id) : null } : null;
  }

  private async catalogProvider(client: Sql): Promise<string> {
    const result = await client.query(`select id from providers where code = 'catalog'`);
    if (!result.rows[0]) {
      throw new AppError(ErrorCodes.SERVICE_UNAVAILABLE, "The catalog provider is not installed.", 503, true);
    }
    return String(result.rows[0].id);
  }

  private async projectSearch(client: Sql, id: string): Promise<void> {
    await client.query(
      `insert into search_documents (
         document_type, subject_id, locale, kind, title, search_vector, geog, country_code, category_slugs, tag_slugs, updated_at
       )
       select 'subject', s.id, s.default_locale, 'place', t.name,
              to_tsvector('simple', t.name || ' ' || coalesce(t.summary, '')),
              p.geog, p.country_code,
              coalesce((select array_agg(c.slug) from subject_categories sc join categories c on c.id = sc.category_id where sc.subject_id = s.id), '{}'),
              coalesce((select array_agg(tg.slug) from subject_tags st join tags tg on tg.id = st.tag_id where st.subject_id = s.id), '{}'),
              clock_timestamp()
       from catalog_subjects s
       join places p on p.subject_id = s.id
       join subject_translations t on t.subject_id = s.id and t.locale = s.default_locale
       where s.id = $1
       on conflict (subject_id, locale) where occurrence_id is null
       do update set
         title = excluded.title,
         search_vector = excluded.search_vector,
         geog = excluded.geog,
         country_code = excluded.country_code,
         category_slugs = excluded.category_slugs,
         tag_slugs = excluded.tag_slugs,
         updated_at = clock_timestamp()`,
      [id],
    );
  }

  private async read(client: Sql, id: string): Promise<PlaceDetail> {
    const result = await client.query(
      `select s.id, s.status, s.default_locale, s.deleted_at, s.created_at, s.updated_at,
              t.name, t.summary, p.country_code, p.timezone, p.street_line, p.locality, p.admin_area, p.postal_code,
              p.phone_e164, p.attributes, p.price_amount_minor, p.price_currency, p.price_basis,
              ST_Y(p.geog::geometry) as latitude, ST_X(p.geog::geometry) as longitude
       from catalog_subjects s
       join places p on p.subject_id = s.id
       left join subject_translations t on t.subject_id = s.id and t.locale = s.default_locale
       where s.id = $1 and s.kind = 'place'`,
      [id],
    );
    const row = result.rows[0];
    if (!row) {
      throw new AppError(ErrorCodes.NOT_FOUND, "That place was not found.", 404);
    }
    const [categories, tags, hours, media, providers, website, audit] = await Promise.all([
      client.query(`select category_id, is_primary from subject_categories where subject_id = $1`, [id]),
      client.query(`select tag_id from subject_tags where subject_id = $1`, [id]),
      client.query(`select weekday, opens_local, closes_local, spans_next_day from place_hours where place_subject_id = $1 order by weekday, opens_local`, [id]),
      client.query(`select url, alt from subject_media where subject_id = $1 order by position`, [id]),
      client.query(
        `select pr.code, pr.display_name, er.external_id, er.match_method
         from external_references er join providers pr on pr.id = er.provider_id
         where er.subject_id = $1 order by pr.code`,
        [id],
      ),
      client.query(
        `select id, preferred_url from external_destinations
         where subject_id = $1 and destination_type = 'website' and status = 'active'
         order by created_at desc limit 1`,
        [id],
      ),
      client.query(
        `select action, occurred_at from audit_events
         where target_type = 'place' and target_id = $1
         order by occurred_at desc
         limit 8`,
        [id],
      ),
    ]);
    const primary = categories.rows.find((item) => item.is_primary);
    const secondary = categories.rows.find((item) => !item.is_primary);
    return {
      id: String(row.id),
      name: row.name ? String(row.name) : "Untitled",
      summary: row.summary ? String(row.summary) : null,
      status: row.status,
      locale: String(row.default_locale),
      archived: row.deleted_at !== null,
      categoryId: primary ? String(primary.category_id) : null,
      subcategoryId: secondary ? String(secondary.category_id) : null,
      tagIds: tags.rows.map((item) => String(item.tag_id)),
      countryCode: String(row.country_code).trim(),
      timezone: String(row.timezone),
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      streetLine: row.street_line ? String(row.street_line) : null,
      locality: row.locality ? String(row.locality) : null,
      adminArea: row.admin_area ? String(row.admin_area) : null,
      postalCode: row.postal_code ? String(row.postal_code) : null,
      phoneE164: row.phone_e164 ? String(row.phone_e164) : null,
      websiteUrl: website.rows[0]?.preferred_url ? String(website.rows[0].preferred_url) : null,
      websiteDestinationId: website.rows[0] ? String(website.rows[0].id) : null,
      price:
        row.price_amount_minor === null
          ? null
          : { amountMinor: Number(row.price_amount_minor), currency: String(row.price_currency).trim(), basis: row.price_basis },
      hours: hours.rows.map((item) => ({
        weekday: Number(item.weekday),
        opensLocal: String(item.opens_local).slice(0, 5),
        closesLocal: String(item.closes_local).slice(0, 5),
        spansNextDay: Boolean(item.spans_next_day),
      })),
      media: media.rows.map((item) => ({ url: String(item.url), alt: item.alt ? String(item.alt) : null })),
      attributes: row.attributes && typeof row.attributes === "object" ? row.attributes : {},
      providerReferences: providers.rows.map((item) => ({
        providerCode: String(item.code),
        providerName: String(item.display_name),
        externalId: String(item.external_id),
        matchMethod: String(item.match_method),
      })),
      audit: audit.rows.map((item) => ({
        action: String(item.action),
        occurredAt: new Date(item.occurred_at).toISOString(),
      })),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  private async audit(client: Sql, actorUserId: string, requestId: string, action: string, id: string): Promise<void> {
    await client.query(
      `insert into audit_events (actor_user_id, actor_role, action, target_type, target_id, request_id)
       values ($1, 'admin', $2, 'place', $3, $4)`,
      [actorUserId, action, id, requestId],
    );
  }

  private async transaction(work: (client: PoolClient) => Promise<string>): Promise<PlaceDetail> {
    const client = await this.database.pool.connect();
    let committed = false;
    try {
      await client.query("begin");
      const id = await work(client);
      await client.query("commit");
      committed = true;
      return await this.read(client, id);
    } catch (error) {
      if (!committed) {
        await client.query("rollback").catch(() => undefined);
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

function placeParams(id: string, input: PlaceWrite, website: string | null): unknown[] {
  return [
    id,
    input.longitude,
    input.latitude,
    input.countryCode.toUpperCase(),
    input.timezone,
    input.streetLine ?? null,
    input.locality ?? null,
    input.adminArea ?? null,
    input.postalCode ?? null,
    input.phoneE164 ?? null,
    website ? new URL(website).hostname : null,
    JSON.stringify(input.attributes),
    input.price?.amountMinor ?? null,
    input.price?.currency ?? null,
    input.price?.basis ?? null,
  ];
}

