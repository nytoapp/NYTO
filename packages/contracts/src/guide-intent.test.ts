import { describe, expect, it } from "vitest";
import { classifyGuideRequest } from "./guide-intent";

describe("guide intent", () => {
  it("keeps a category query on search", () => {
    expect(classifyGuideRequest("Italian restaurants")).toEqual({
      kind: "search",
      searchQuery: "Italian restaurants",
      message: null,
    });
  });

  it("keeps a timed category query on search", () => {
    expect(classifyGuideRequest("restaurants tonight").kind).toBe("search");
    expect(classifyGuideRequest("restaurants tonight").searchQuery).toBe("restaurants tonight");
  });

  it("turns an open evening question into a catalog guide search", () => {
    expect(classifyGuideRequest("What should I do tonight?")).toEqual({
      kind: "guide",
      searchQuery: "things to do tonight",
      message: null,
    });
  });

  it("does not send a planning prompt to place search", () => {
    const intent = classifyGuideRequest("Suggest a 3-day itinerary");
    expect(intent.kind).toBe("planning");
    expect(intent.searchQuery).toBeNull();
    expect(intent.message).toBe("I can build that once CITYDAY has enough places and experiences in this city.");
  });

  it("does not pretend hidden gems or date nights are search hits", () => {
    expect(classifyGuideRequest("Show me hidden gems").searchQuery).toBeNull();
    expect(classifyGuideRequest("Best places for a first date").kind).toBe("discovery");
    expect(classifyGuideRequest("Best places for a first date").searchQuery).toBeNull();
  });

  it("does not invent events for what is happening", () => {
    const intent = classifyGuideRequest("What's happening tonight?");
    expect(intent.kind).toBe("guide");
    expect(intent.searchQuery).toBeNull();
    expect(intent.message).toContain("scheduled events");
  });
});
