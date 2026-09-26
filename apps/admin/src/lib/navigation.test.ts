import { describe, expect, it } from "vitest";
import { navigation, readyHrefs } from "./navigation";

describe("admin navigation", () => {
  it("exposes overview and places as implemented routes", () => {
    expect(readyHrefs()).toEqual(["/admin", "/admin/places"]);
    const unfinished = navigation.flatMap((group) => group.items).filter((item) => item.status === "soon");
    expect(unfinished.length).toBeGreaterThan(10);
    expect(unfinished.every((item) => item.href === undefined)).toBe(true);
  });
});
