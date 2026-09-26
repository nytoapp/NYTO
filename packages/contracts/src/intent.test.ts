import { describe, expect, it } from "vitest";
import { parsedIntentSchema } from "./intent";

const validIntent = {
  schemaVersion: 1 as const,
  interpreter: "rules" as const,
  confidence: 0.8,
  queryLanguage: "en",
  task: "search" as const,
  kinds: ["place" as const],
  categorySlugs: ["italian", "restaurant"],
  tagSlugs: ["romantic"],
  freeText: "Italian restaurant",
  location: { mode: "near_me" as const, text: null },
  radiusMeters: 5000,
  timeWindow: { kind: "weekday" as const, weekday: 6, timeOfDay: null },
  partySize: null,
  budget: { amountMinor: 300000, currency: "INR", basis: "total" as const },
  preferences: ["romantic"],
};

describe("parsedIntentSchema", () => {
  it("accepts a constraint object", () => {
    expect(parsedIntentSchema.safeParse(validIntent).success).toBe(true);
  });

  it.each(["prices", "address", "hours", "availability", "url", "rating", "latitude"])(
    "rejects factual field %s",
    (field) => {
      const result = parsedIntentSchema.safeParse({ ...validIntent, [field]: "invented" });
      expect(result.success).toBe(false);
    },
  );
});
