import { describe, expect, it } from "vitest";
import { assembleOverview } from "../src/modules/admin/overview.assemble";

const counts = { places: 4, events: 1, providers: 1, users: 0, saves: 2, trips: 1 };

describe("admin overview assembly", () => {
  it("reads catalog counts and refuses to invent search volume or provider latency", () => {
    const overview = assembleOverview(
      {
        counts,
        categories: [{ slug: "restaurant", label: "Restaurants", subjectCount: 2 }],
        recentSubjects: [
          {
            id: "018f5c3a-7c3a-7000-8000-0000000000b1",
            kind: "place",
            title: "Osteria",
            createdAt: "2026-09-26T00:00:00.000Z",
          },
        ],
        providers: [{ code: "fixture", name: "Fixture", status: "active" }],
        activity: [],
      },
      new Date("2026-09-26T12:00:00.000Z"),
    );
    expect(overview.metrics.find((metric) => metric.key === "places")?.value).toBe(4);
    expect(overview.metrics.find((metric) => metric.key === "searches")).toEqual({
      key: "searches",
      label: "Searches",
      value: null,
      availability: "unavailable",
      note: "Search volume is not stored.",
    });
    expect(overview.providers[0]).toMatchObject({ latencyMs: null, lastSuccessAt: null, telemetry: "unavailable" });
    expect(overview.alerts).toEqual([]);
    expect(overview.activity).toEqual([]);
  });

  it("raises an alert only for a provider the database marks disabled", () => {
    const overview = assembleOverview(
      {
        counts,
        categories: [],
        recentSubjects: [],
        providers: [{ code: "example", name: "Example", status: "disabled" }],
        activity: [],
      },
      new Date("2026-09-26T12:00:00.000Z"),
    );
    expect(overview.alerts).toEqual([
      { code: "provider_disabled:example", severity: "attention", message: "Example is disabled." },
    ]);
  });
});
