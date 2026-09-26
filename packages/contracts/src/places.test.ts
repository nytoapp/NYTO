import { describe, expect, it } from "vitest";
import { placeListQuerySchema, placeWriteSchema } from "./places";

const place = {
  name: "North Cafe",
  categoryId: "018f5c3a-7c3a-7000-8000-0000000000d1",
  countryCode: "FR",
  timezone: "Europe/Paris",
  latitude: 48.85,
  longitude: 2.35,
};

describe("placeWriteSchema", () => {
  it("accepts a minimal catalog place", () => {
    const parsed = placeWriteSchema.safeParse(place);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe("draft");
      expect(parsed.data.price).toBeUndefined();
    }
  });

  it("rejects a deleted status, a partial price, and an inverted opening window", () => {
    expect(placeWriteSchema.safeParse({ ...place, status: "deleted" }).success).toBe(false);
    expect(placeWriteSchema.safeParse({ ...place, price: { amountMinor: 100 } }).success).toBe(false);
    expect(
      placeWriteSchema.safeParse({
        ...place,
        hours: [{ weekday: 1, opensLocal: "18:00", closesLocal: "09:00", spansNextDay: false }],
      }).success,
    ).toBe(false);
  });

  it("rejects more than twenty attributes", () => {
    const attributes = Object.fromEntries(Array.from({ length: 21 }, (_, index) => [`key${index}`, "value"]));
    expect(placeWriteSchema.safeParse({ ...place, attributes }).success).toBe(false);
  });
});

describe("placeListQuerySchema", () => {
  it("caps page size and offset", () => {
    expect(placeListQuerySchema.safeParse({ limit: 25, offset: 50 }).success).toBe(true);
    expect(placeListQuerySchema.safeParse({ limit: 51 }).success).toBe(false);
    expect(placeListQuerySchema.safeParse({ offset: 5001 }).success).toBe(false);
    expect(placeListQuerySchema.safeParse({ sort: "name;drop" }).success).toBe(false);
  });
});
