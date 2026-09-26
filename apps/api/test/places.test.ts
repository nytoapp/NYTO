import { readFileSync } from "node:fs";
import path from "node:path";
import "reflect-metadata";
import { Client } from "pg";
import { describe, expect, it } from "vitest";
import { Reflector } from "@nestjs/core";
import { ErrorCodes } from "@atlas/contracts";
import { AppError } from "../src/shared/http/app-error";
import { RequireAuthGuard, ROLES_KEY, RolesGuard } from "../src/shared/http/auth.guard";
import { parsePlaceId, parsePlaceListQuery, PlacesAdminController } from "../src/modules/admin/places.controller";
import { buildPlaceListSql } from "../src/modules/admin/places.list-sql";
import { placeTransition, statusAfterWrite } from "../src/modules/admin/places.transitions";
import { assertPublicHttps, isUniqueViolation } from "../src/modules/admin/places.urls";

const root = path.resolve(import.meta.dirname, "..");

describe("place admin authorization", () => {
  it("keeps place administration behind the admin role", () => {
    const reflector = new Reflector();
    expect(reflector.get(ROLES_KEY, PlacesAdminController)).toEqual(["admin"]);
    const guest = {
      switchToHttp: () => ({ getRequest: () => ({}) }),
      getHandler: () => function handler() {},
      getClass: () => PlacesAdminController,
    };
    expect(() => new RequireAuthGuard().canActivate(guest as never)).toThrow(AppError);
    const forbidden = new RolesGuard({ getAllAndOverride: () => ["admin"] } as unknown as Reflector);
    const member = {
      ...guest,
      switchToHttp: () => ({ getRequest: () => ({ user: { userId: "u", sessionId: "s", roles: ["user"] } }) }),
    };
    try {
      forbidden.canActivate(member as never);
      throw new Error("expected a forbidden response");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).errorCode).toBe(ErrorCodes.FORBIDDEN);
    }
  });
});

describe("place writes", () => {
  it("rejects an invalid place id", () => {
    expect(() => parsePlaceId("not-a-place")).toThrow(AppError);
    try {
      parsePlaceId("not-a-place");
    } catch (error) {
      expect((error as AppError).status).toBe(422);
    }
    expect(parsePlaceId("018f5c3a-7c3a-7000-8000-0000000000b1")).toBe("018f5c3a-7c3a-7000-8000-0000000000b1");
  });

  it("archives softly and restores to draft", () => {
    expect(placeTransition("archive", false)).toEqual({ apply: true, status: "deleted" });
    expect(placeTransition("archive", true)).toEqual({ apply: false });
    expect(placeTransition("restore", true)).toEqual({ apply: true, status: "draft" });
    expect(placeTransition("restore", false)).toEqual({ conflict: true });
    expect(statusAfterWrite(true, "active")).toBe("deleted");
    expect(statusAfterWrite(false, "active")).toBe("active");
  });

  it("maps a duplicate provider identity and rejects unsafe URLs", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(assertPublicHttps("https://example.com/menu", "websiteUrl")).toBe("https://example.com/menu");
    expect(() => assertPublicHttps("javascript:alert(1)", "websiteUrl")).toThrow(AppError);
    expect(() => assertPublicHttps("http://example.com", "websiteUrl")).toThrow(AppError);
    expect(() => assertPublicHttps("https://127.0.0.1/admin", "media")).toThrow(AppError);
    expect(() => assertPublicHttps("https://user:secret@example.com", "websiteUrl")).toThrow(AppError);
  });
});

describe("place list query", () => {
  it("binds search text and pages without interpolating it", () => {
    const query = parsePlaceListQuery({
      q: "'; drop table places;--",
      status: "active",
      categoryId: "018f5c3a-7c3a-7000-8000-0000000000d1",
      countryCode: "fr",
      locality: "Paris",
      limit: "10",
      offset: "20",
      sort: "name",
      direction: "asc",
    });
    const sql = buildPlaceListSql(query);
    expect(sql.text).not.toContain("drop table");
    expect(sql.text).toContain("s.deleted_at IS NULL");
    expect(sql.text).toContain("ORDER BY t.name ASC");
    expect(sql.values).toContain("%'; drop table places;--%");
    expect(sql.values.at(-2)).toBe(10);
    expect(sql.values.at(-1)).toBe(20);
    expect(sql.countValues).not.toContain(10);
  });

  it("can include archived places and reject an unknown sort", () => {
    const archived = buildPlaceListSql(parsePlaceListQuery({ status: "deleted", includeArchived: "true" }));
    expect(archived.text).not.toContain("deleted_at IS NULL");
    expect(() => parsePlaceListQuery({ sort: "rating" })).toThrow(AppError);
    expect(() => parsePlaceListQuery({ limit: "0" })).toThrow(AppError);
  });
});

describe("place schema constraints", () => {
  it("keeps one place table, a price check, and provider identity uniqueness", () => {
    const migration = readFileSync(path.join(root, "migrations/003_place_admin.sql"), "utf8");
    const foundation = readFileSync(path.join(root, "migrations/001_foundation.sql"), "utf8");
    const seed = readFileSync(path.join(root, "seeds/002_fixture.sql"), "utf8");
    expect(migration).toContain("places_price_complete");
    expect(migration).toContain("CREATE TABLE subject_media");
    expect(migration).toContain("VALUES ('catalog', 'Catalog', 'active', 'licensed_store')");
    expect(migration).not.toContain("CREATE TABLE restaurants");
    expect(foundation).toContain("UNIQUE (provider_id, external_id)");
    expect(foundation).toContain("UNIQUE (provider_id, subject_id)");
    expect(seed).toContain("'018f5c3a-7c3a-7000-8000-0000000000d2', '018f5c3a-7c3a-7000-8000-0000000000d1'");
  });
});

describe("place database", () => {
  it("runs only when postgres accepts a connection", async (context) => {
    const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 800 });
    try {
      await client.connect();
    } catch {
      context.skip();
      return;
    }
    try {
      const result = await client.query("select to_regclass('public.subject_media') as media");
      expect(result.rows[0]?.media).toBe("subject_media");
    } finally {
      await client.end();
    }
  });
});
