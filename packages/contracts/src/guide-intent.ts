export const guideIntentKinds = ["search", "discovery", "planning", "guide"] as const;

export type GuideIntentKind = (typeof guideIntentKinds)[number];

export type GuideIntent = {
  kind: GuideIntentKind;
  /** Catalog search text. Null means this request must not be sent to place search. */
  searchQuery: string | null;
  message: string | null;
};

const PLANNING_MESSAGE = "I can build that once CITYDAY has enough places and experiences in this city.";

function normalize(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/**
 * Classifies a guide request before catalog search.
 * Planning and unsupported discovery prompts stay out of literal text search.
 * The classifier does not invent venues, hours, prices, or rankings.
 */
export function classifyGuideRequest(raw: string): GuideIntent {
  const query = normalize(raw);
  const text = query.toLowerCase();
  if (!text) {
    return { kind: "search", searchQuery: "", message: null };
  }

  if (/\bitinerary\b|\bday by day\b|\b\d+\s*-?\s*days?\b|\bplan my\b|\btrip plan\b/.test(text)) {
    return { kind: "planning", searchQuery: null, message: PLANNING_MESSAGE };
  }
  if (/\bhidden gems?\b/.test(text)) {
    return {
      kind: "discovery",
      searchQuery: null,
      message: "CITYDAY does not have a hidden-gem list for this city yet.",
    };
  }
  if (/\b(first date|date night)\b/.test(text)) {
    return {
      kind: "discovery",
      searchQuery: null,
      message: "CITYDAY does not have date-night picks for this city yet.",
    };
  }
  if (/\bwhat(?:'s| is) happening\b/.test(text)) {
    return {
      kind: "guide",
      searchQuery: null,
      message: "CITYDAY does not have scheduled events for this city yet.",
    };
  }
  if (/\bwhat should i do\b|\bwhat can i do\b|\bthings to do\b/.test(text)) {
    const parts = ["things to do"];
    if (/\btonight\b/.test(text)) parts.push("tonight");
    if (/\bthis weekend\b/.test(text)) parts.push("this weekend");
    return { kind: "guide", searchQuery: parts.join(" "), message: null };
  }
  if (/\b(best places|where should i)\b/.test(text)) {
    return { kind: "discovery", searchQuery: "things to do", message: null };
  }
  return { kind: "search", searchQuery: query, message: null };
}
