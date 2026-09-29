import { describe, expect, it } from "vitest";
import { consumerReasons, publicImageUrl, readBooking, readImages, readPrice } from "./facts";

describe("catalog facts", () => {
  it("keeps only https images", () => {
    expect(publicImageUrl("https://images.example/a.jpg")).toBe("https://images.example/a.jpg");
    expect(publicImageUrl("http://images.example/a.jpg")).toBeNull();
    expect(publicImageUrl("javascript:alert(1)")).toBeNull();
    expect(
      readImages([
        { url: "https://images.example/a.jpg", alt: "Room", position: 0 },
        { url: "http://images.example/b.jpg", alt: null, position: 1 },
      ]),
    ).toEqual([{ url: "https://images.example/a.jpg", alt: "Room", position: 0 }]);
  });

  it("reads a stored price and ignores a partial one", () => {
    expect(readPrice(1800, "eur", "per_person")).toEqual({ amountMinor: 1800, currency: "EUR", basis: "per_person" });
    expect(readPrice(null, null, null)).toBeNull();
    expect(readPrice(10, "EUR", "hourly")).toBeNull();
  });

  it("exposes a destination without inventing a booking action", () => {
    expect(readBooking({ id: "018f5c3a-7c3a-7000-8000-0000000000f1", type: "website", label: "Visit website" })).toEqual({
      capability: "website",
      destinationId: "018f5c3a-7c3a-7000-8000-0000000000f1",
      label: "Visit website",
    });
    expect(readBooking(null).capability).toBe("unavailable");
    expect(readBooking({ id: "x", type: "book", label: "Book" }).capability).toBe("unavailable");
  });

  it("turns rank signals into one consumer reason", () => {
    expect(consumerReasons(["nearby", "name-match"])).toEqual(["Nearby"]);
    expect(consumerReasons(["name-match"])).toEqual([]);
  });
});
