import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { buildResultFilters } from "@atlas/contracts";
import { interpretWithRules } from "../src/modules/search/rules-intent";
import { resolveTimeWindow } from "../src/modules/search/time-window";
import { dedupeObservations, type Observation } from "../src/modules/search/dedupe";
import { rankObservations } from "../src/modules/search/rank";
import { buildCatalogSearchSql } from "../src/modules/search/query-sql";
import { validateDestinationUrl } from "../src/modules/destinations/url-policy";
import { readDestinationHandle, signDestinationHandle } from "../src/modules/destinations/handles";
import { chooseLocation } from "../src/modules/geo/choose-location";
import { CircuitBreaker, ProviderGateway, type ProviderAdapter } from "../src/modules/providers/gateway";
import { observationsFromPlacesBody } from "../src/modules/providers/google-parse";
import { FixtureAdapter } from "../src/modules/providers/adapters/fixture.adapter";
import { hashPassword, verifyPassword } from "../src/modules/identity/crypto";
import { fallbackIntent } from "../src/modules/search/rules-intent";
import { parsedIntentSchema, ErrorCodes } from "@atlas/contracts";
import { RequireAuthGuard, RolesGuard } from "../src/shared/http/auth.guard";
import { AppError } from "../src/shared/http/app-error";
import { Reflector } from "@nestjs/core";

const secret = "test-destination-secret-32-characters";

function observation(overrides: Partial<Observation>): Observation {
  return {
    provider: "fixture",
    externalId: "ext",
    subjectId: null,
    kind: "place",
    title: "Cafe",
    summary: null,
    latitude: 48.85,
    longitude: 2.35,
    attribution: [],
    confidence: 0.5,
    fetchedAt: new Date().toISOString(),
    expiresAt: null,
    state: "ok",
    destinationId: null,
    destinationLabel: null,
    countryCode: "FR",
    categorySlugs: [],
    tagSlugs: [],
    startsAt: null,
    factSource: "provider",
    ...overrides,
  };
}

describe("rules intent", () => {
  it("parses a natural-language dining request without inventing facts", () => {
    const intent = interpretWithRules("Find me a romantic Italian restaurant near me for Saturday under ₹3000", "en");
    expect(intent.task).toBe("search");
    expect(intent.kinds).toEqual(["place"]);
    expect(intent.categorySlugs).toEqual(expect.arrayContaining(["italian", "restaurant"]));
    expect(intent.preferences).toContain("romantic");
    expect(intent.location.mode).toBe("near_me");
    expect(intent.timeWindow.weekday).toBe(6);
    expect(intent.budget).toEqual({ amountMinor: 300_000, currency: "INR", basis: "total" });
    expect(parsedIntentSchema.safeParse({ ...intent, address: "1 Rue" }).success).toBe(false);
  });

  it("parses an open weekend question", () => {
    const intent = interpretWithRules("What can I do in Paris this weekend?", "en");
    expect(intent.task).toBe("discover");
    expect(intent.kinds).toEqual([]);
    expect(intent.location).toEqual({ mode: "text", text: "Paris" });
    expect(intent.timeWindow.kind).toBe("weekend");
  });

  it.each(["Restaurants", "Restaurants tonight", "restaurant tonight", "Tonight", "Food Tonight"])(
    "represents tonight once for %s",
    (query) => {
      const parsed = interpretWithRules(query, "en");
      const filters = buildResultFilters({ query, intent: parsed, sort: "recommended" });
      expect(filters.filter((filter) => filter.key === "tonight")).toHaveLength(1);
      expect(new Set(filters.map((filter) => filter.key)).size).toBe(filters.length);
    },
  );

  it("turns catalog questions into constraints instead of required leftover words", () => {
    expect(interpretWithRules("Best restaurants", "en")).toMatchObject({
      categorySlugs: ["restaurant"],
      freeText: "",
    });
    expect(interpretWithRules("Something cultural", "en")).toMatchObject({
      categorySlugs: ["culture"],
      freeText: "",
    });
    const tonight = interpretWithRules("What should I do tonight?", "en");
    expect(tonight.kinds).toEqual(["place"]);
    expect(tonight.timeWindow.kind).toBe("tonight");
    expect(tonight.freeText).toBe("");
    expect(interpretWithRules("Date night", "en").freeText).toBe("Date night");
  });

  it("keeps keyword searches on the standard path", () => {
    expect(interpretWithRules("Italian restaurant", "en").categorySlugs).toContain("restaurant");
    expect(interpretWithRules("movies", "en").kinds).toEqual(["media"]);
    expect(interpretWithRules("hotels in Paris", "en").location.text).toBe("Paris");
    expect(interpretWithRules("Interstellar", "en").freeText).toBe("Interstellar");
  });

  it("falls back when the candidate cannot satisfy the schema", () => {
    const intent = fallbackIntent("pizza", "en");
    expect(intent.interpreter).toBe("fallback");
    expect(intent.budget).toBeNull();
  });
});

describe("time windows", () => {
  it("resolves Saturday in the location zone", () => {
    const now = DateTime.fromISO("2026-09-24T12:00:00", { zone: "Europe/Paris" });
    const resolved = resolveTimeWindow({ kind: "weekday", weekday: 6, timeOfDay: null }, "Europe/Paris", now);
    expect(resolved.dateFrom).toBe("2026-09-26");
  });
});

describe("dedupe and rank", () => {
  it("links nearby duplicates and keeps distant chain branches", () => {
    const near = dedupeObservations([
      observation({ externalId: "a", title: "Osteria", latitude: 48.858, longitude: 2.362, confidence: 0.4 }),
      observation({ externalId: "b", provider: "google_places", title: "Osteria", latitude: 48.8582, longitude: 2.3621, confidence: 0.9 }),
    ]);
    expect(near).toHaveLength(1);
    expect(near[0]?.provider).toBe("google_places");
    const far = dedupeObservations([
      observation({ externalId: "a", title: "Chain", latitude: 48.85, longitude: 2.35 }),
      observation({ externalId: "b", title: "Chain", latitude: 48.86, longitude: 2.4 }),
    ]);
    expect(far).toHaveLength(2);
  });

  it("orders a closer name match ahead of a distant one", () => {
    const ranked = rankObservations(
      [
        observation({ title: "Far Italian", latitude: 49.5, longitude: 3.2, externalId: "far" }),
        observation({ title: "Italian", latitude: 48.851, longitude: 2.351, externalId: "near" }),
      ],
      { freeText: "Italian", origin: { latitude: 48.85, longitude: 2.35 } },
    );
    expect(ranked[0]?.externalId).toBe("near");
    expect(ranked[0]?.reasons).toContain("nearby");
  });
});

describe("search sql", () => {
  it("binds malicious text instead of interpolating it", () => {
    const intent = interpretWithRules("'; drop table users;--", "en");
    const sql = buildCatalogSearchSql({
      intent,
      startsAfter: null,
      startsBefore: null,
      latitude: null,
      longitude: null,
      locale: "en",
    });
    expect(sql.text).not.toContain("drop table");
    expect(sql.values).toContain(intent.freeText);
    expect(sql.text).toContain("deleted_at IS NULL");
  });
});

describe("destinations", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html,hi",
    "file:///etc/passwd",
    "http://example.com/insecure",
    "https://evil.example/phish",
    "https://127.0.0.1/secret",
    "https://user:pass@example.com/x",
  ])("rejects %s", (url) => {
    expect(validateDestinationUrl(url, ["example.com"], ["https"]).ok).toBe(false);
  });

  it("accepts an allowlisted https url and rejects a tampered handle", () => {
    expect(validateDestinationUrl("https://example.com/fixture/osteria", ["example.com"], ["https"]).ok).toBe(true);
    const handle = signDestinationHandle({ provider: "fixture", externalId: "1", action: "website" }, secret);
    expect(readDestinationHandle(handle, secret)?.provider).toBe("fixture");
    expect(readDestinationHandle(`${handle}tampered`, secret)).toBeNull();
  });
});

describe("locations", () => {
  const parisFr = { id: "1", label: "Paris", countryCode: "FR", timezone: "Europe/Paris", latitude: 48.8, longitude: 2.3 };
  const parisUs = { id: "2", label: "Paris", countryCode: "US", timezone: "America/Chicago", latitude: 33.6, longitude: -95.5 };

  it("asks when a name is ambiguous and uses a country bias", () => {
    expect(chooseLocation([parisFr, parisUs], null).type).toBe("ambiguous");
    const biased = chooseLocation([parisFr, parisUs], "FR");
    expect(biased.type).toBe("one");
    if (biased.type === "one") {
      expect(biased.location.countryCode).toBe("FR");
    }
  });
});

describe("provider gateway", () => {
  it("returns the other provider when one times out", async () => {
    const failing = new FixtureAdapter();
    failing.failMode = "timeout";
    const healthy: ProviderAdapter = {
      code: "healthy",
      timeoutMs: 200,
      search: async () => ({ observations: [observation({ provider: "healthy", externalId: "ok" })], warning: null }),
      buildDestination: async () => null,
    };
    const gateway = new ProviderGateway([failing, healthy]);
    const result = await gateway.search({ text: "cafe", latitude: null, longitude: null, radiusMeters: null, locale: "en" });
    expect(result.observations.map((item) => item.provider)).toContain("healthy");
    expect(result.warnings.some((warning) => warning.code === "timeout")).toBe(true);
  });

  it("drops a malformed provider payload without throwing", () => {
    expect(() => observationsFromPlacesBody({ places: "nope" })).toThrow(/malformed/);
    expect(observationsFromPlacesBody({ places: [{ id: 1 }, { id: "abc", displayName: { text: "Kept" } }] })).toHaveLength(1);
  });

  it("opens the circuit after repeated failures", () => {
    const breaker = new CircuitBreaker(2, 60_000);
    breaker.recordFailure("google_places", 0);
    breaker.recordFailure("google_places", 0);
    expect(breaker.canCall("google_places", 0)).toBe(false);
  });

  it("keeps searching when one provider is unavailable", async () => {
    const failing = new FixtureAdapter();
    failing.failMode = "unavailable";
    const healthy: ProviderAdapter = {
      code: "healthy",
      timeoutMs: 200,
      search: async () => ({ observations: [observation({ provider: "healthy", externalId: "ok" })], warning: null }),
      buildDestination: async () => null,
    };
    const gateway = new ProviderGateway([failing, healthy]);
    const result = await gateway.search({ text: "cafe", latitude: null, longitude: null, radiusMeters: null, locale: "en" });
    expect(result.observations).toHaveLength(1);
    expect(result.warnings.some((warning) => warning.code === "unavailable")).toBe(true);
  });
});

describe("authentication boundary", () => {
  const guest = {
    switchToHttp: () => ({ getRequest: () => ({}) }),
    getHandler: () => function handler() {},
    getClass: () => class Host {},
  };

  it("returns AUTHENTICATION_REQUIRED for a guest", () => {
    const guard = new RequireAuthGuard();
    expect(() => guard.canActivate(guest as never)).toThrow(AppError);
    try {
      guard.canActivate(guest as never);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).errorCode).toBe(ErrorCodes.AUTHENTICATION_REQUIRED);
      expect((error as AppError).status).toBe(401);
    }
  });

  it("returns FORBIDDEN when the role is missing", () => {
    const reflector = { getAllAndOverride: () => ["admin"] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const member = {
      ...guest,
      switchToHttp: () => ({ getRequest: () => ({ user: { userId: "u", sessionId: "s", roles: ["member"] } }) }),
    };
    expect(() => guard.canActivate(member as never)).toThrow(AppError);
    try {
      guard.canActivate(member as never);
    } catch (error) {
      expect((error as AppError).errorCode).toBe(ErrorCodes.FORBIDDEN);
    }
  });
});

describe("passwords", () => {
  it("verifies argon2id hashes", async () => {
    const hash = await hashPassword("correct-horse-battery");
    expect(await verifyPassword("correct-horse-battery", hash)).toBe(true);
    expect(await verifyPassword("nope-nope-nope-nope", hash)).toBe(false);
  });
});

describe("architecture boundaries", () => {
  const root = path.join(__dirname, "..", "src", "modules");

  it("keeps catalog and home off the provider gateway", () => {
    const home = readFileSync(path.join(root, "editorial", "home.service.ts"), "utf8");
    const geo = readFileSync(path.join(root, "geo", "geo.service.ts"), "utf8");
    expect(home).not.toContain("ProviderGateway");
    expect(home).not.toContain("google");
    expect(geo).not.toContain("ProviderGateway");
    const search = readFileSync(path.join(root, "search", "search.service.ts"), "utf8");
    expect(search).not.toContain("adapters/google");
    expect(search).not.toContain("GooglePlacesAdapter");
  });

  it("does not let mobile or admin source import Google SDK types", () => {
    for (const app of ["mobile", "admin"]) {
      const dir = path.join(__dirname, "..", "..", "..", app);
      if (!statSafe(dir)) {
        continue;
      }
      const files = walk(dir).filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"));
      for (const file of files) {
        const source = readFileSync(file, "utf8");
        expect(source).not.toContain("google-auth-library");
        expect(source).not.toContain("@googlemaps/google-maps-services-js");
      }
    }
  });
});

describe("migration contract", () => {
  const sql = readFileSync(path.join(__dirname, "..", "migrations", "001_foundation.sql"), "utf8");

  it("uses utc timestamps, geography, uuidv7, and partial unique indexes", () => {
    expect(sql).toContain("atlas_uuidv7()");
    expect(sql).toContain("timestamptz");
    expect(sql).toContain("geography(Point, 4326)");
    expect(sql).toContain("WHERE deleted_at IS NULL");
    expect(sql).toContain("WHERE occurrence_id IS NULL");
    expect(sql).not.toContain("google_restaurants");
  });
});

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = path.join(directory, entry);
    if (entry === "node_modules" || entry === "dist" || entry === ".expo") {
      return [];
    }
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function statSafe(directory: string): boolean {
  try {
    return statSync(directory).isDirectory();
  } catch {
    return false;
  }
}
