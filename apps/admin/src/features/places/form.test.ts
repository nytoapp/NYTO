import { describe, expect, it } from "vitest";
import { compilePlaceDraft, emptyDraft } from "./form";

const categoryId = "018f5c3a-7c3a-7000-8000-0000000000d1";

function ready() {
  return {
    ...emptyDraft(),
    name: "North Cafe",
    categoryId,
    countryCode: "FR",
    timezone: "Europe/Paris",
    latitude: "48.85",
    longitude: "2.35",
  };
}

describe("place form", () => {
  it("compiles a draft through the shared place contract", () => {
    const compiled = compilePlaceDraft(ready());
    expect(compiled.ok).toBe(true);
    if (compiled.ok) {
      expect(compiled.value.status).toBe("draft");
      expect(compiled.value.price).toBeNull();
    }
  });

  it("requires a complete price and stores major units as minor units", () => {
    const partial = compilePlaceDraft({ ...ready(), priceAmount: "12.50" });
    expect(partial.ok).toBe(false);
    const priced = compilePlaceDraft({ ...ready(), priceAmount: "12.50", priceCurrency: "USD", priceBasis: "total" });
    expect(priced.ok).toBe(true);
    if (priced.ok) {
      expect(priced.value.price).toEqual({ amountMinor: 1250, currency: "USD", basis: "total" });
    }
    const yen = compilePlaceDraft({ ...ready(), priceAmount: "3000", priceCurrency: "JPY", priceBasis: "per_person" });
    expect(yen.ok && yen.value.price?.amountMinor).toBe(3000);
  });

  it("reports a missing name from the shared schema", () => {
    const compiled = compilePlaceDraft({ ...ready(), name: "" });
    expect(compiled.ok).toBe(false);
    if (!compiled.ok) {
      expect(compiled.errors.name).toBeTruthy();
    }
  });
});
