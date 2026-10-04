import { describe, expect, it } from "vitest";
import type { ParsedIntent } from "./intent";
import { buildResultFilters } from "./result-filters";

function intent(overrides: Partial<ParsedIntent> = {}): ParsedIntent {
  return {
    schemaVersion: 1,
    interpreter: "rules",
    confidence: 0.8,
    queryLanguage: "en",
    task: "search",
    kinds: ["place"],
    categorySlugs: [],
    tagSlugs: [],
    freeText: "",
    location: { mode: "selected", text: null },
    radiusMeters: null,
    timeWindow: { kind: "none", weekday: null, timeOfDay: null },
    partySize: null,
    budget: null,
    preferences: [],
    ...overrides,
  };
}

function keys(query: string, parsed: ParsedIntent | null) {
  return buildResultFilters({ query, intent: parsed, sort: "recommended" }).map((filter) => filter.key);
}

describe("result filter identity", () => {
  it("shows one Tonight chip when the interpreter and the default filters both include it", () => {
    const parsed = intent({ timeWindow: { kind: "tonight", weekday: null, timeOfDay: "evening" } });
    const tonight = keys("Restaurants tonight", parsed).filter((key) => key === "tonight");
    expect(tonight).toEqual(["tonight"]);
  });

  it.each(["Restaurants", "Restaurants tonight", "restaurant tonight", "Tonight", "Food Tonight"])(
    "does not repeat a semantic chip for %s",
    (query) => {
      const tonight = query.toLowerCase().includes("tonight");
      const parsed = intent({
        categorySlugs: query.toLowerCase().includes("restaurant") || query.toLowerCase().includes("food") ? ["restaurant"] : [],
        timeWindow: tonight ? { kind: "tonight", weekday: null, timeOfDay: "evening" } : { kind: "none", weekday: null, timeOfDay: null },
      });
      const list = keys(query, parsed);
      expect(new Set(list).size).toBe(list.length);
      expect(list.filter((key) => key === "tonight")).toHaveLength(1);
    },
  );

  it("ignores case and extra spaces when matching Tonight", () => {
    const parsed = intent({ timeWindow: { kind: "tonight", weekday: null, timeOfDay: "evening" } });
    const filters = buildResultFilters({ query: "  TONIGHT   ", intent: parsed, sort: "recommended" });
    expect(filters.filter((filter) => filter.key === "tonight")).toHaveLength(1);
    expect(filters.find((filter) => filter.key === "tonight")?.selected).toBe(true);
  });
});
