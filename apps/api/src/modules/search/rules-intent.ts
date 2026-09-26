import { toMinorUnits } from "@atlas/config";
import { parsedIntentSchema, type ParsedIntent } from "@atlas/contracts";
import { classifyQuery, normalizeQuery } from "./normalize";

const CUISINES = ["italian", "french", "japanese", "indian", "chinese", "mexican", "thai", "korean", "spanish", "greek"];

const CURRENCY_SYMBOLS: Record<string, string> = {
  "₹": "INR",
  "€": "EUR",
  $: "USD",
  "£": "GBP",
};

export function fallbackIntent(query: string, locale: string): ParsedIntent {
  return {
    schemaVersion: 1,
    interpreter: "fallback",
    confidence: 0.2,
    queryLanguage: locale,
    task: "search",
    kinds: [],
    categorySlugs: [],
    tagSlugs: [],
    freeText: query,
    location: { mode: "selected", text: null },
    radiusMeters: null,
    timeWindow: { kind: "none", weekday: null, timeOfDay: null },
    partySize: null,
    budget: null,
    preferences: [],
  };
}

export function interpretWithRules(rawQuery: string, locale: string): ParsedIntent {
  const normalized = normalizeQuery(rawQuery);
  if (normalized.length === 0) {
    return fallbackIntent("", locale);
  }
  const candidate = buildCandidate(normalized, locale);
  const parsed = parsedIntentSchema.safeParse(candidate);
  return parsed.success ? parsed.data : fallbackIntent(normalized, locale);
}

export interface IntentInterpreter {
  readonly name: "rules" | "llm";
  interpret(query: string, locale: string): Promise<ParsedIntent>;
}

export class RulesIntentInterpreter implements IntentInterpreter {
  readonly name = "rules" as const;

  interpret(query: string, locale: string): Promise<ParsedIntent> {
    return Promise.resolve(interpretWithRules(query, locale));
  }
}

/** Present so a later phase can register a model without changing retrieval. Not called in this phase. */
export class LlmIntentInterpreter implements IntentInterpreter {
  readonly name = "llm" as const;

  interpret(): Promise<ParsedIntent> {
    return Promise.reject(new Error("LLM interpreter is not enabled"));
  }
}

function buildCandidate(normalized: string, locale: string): ParsedIntent {
  const mode = classifyQuery(normalized);
  const discover = /\bwhat can i\b/i.test(normalized);
  const kinds: ParsedIntent["kinds"] = [];
  const categorySlugs: string[] = [];
  const tagSlugs: string[] = [];
  const preferences: string[] = [];

  if (/\b(restaurants?|cafes?)\b/i.test(normalized)) {
    kinds.push("place");
    categorySlugs.push(/\bcafes?\b/i.test(normalized) ? "cafe" : "restaurant");
  }
  if (/\b(hotels?|stays?)\b/i.test(normalized)) {
    kinds.push("accommodation");
    categorySlugs.push("hotel");
  }
  if (/\b(movies?|films?)\b/i.test(normalized)) {
    kinds.push("media");
    categorySlugs.push("movie");
  }
  if (/\bconcerts?\b/i.test(normalized)) {
    kinds.push("event");
    categorySlugs.push("concert");
  }
  if (/\b(hikes?|hiking|activities)\b/i.test(normalized)) {
    kinds.push("activity");
  }
  if (/\b(class|experience|tasting)\b/i.test(normalized)) {
    kinds.push("experience");
  }

  for (const cuisine of CUISINES) {
    if (new RegExp(`\\b${cuisine}\\b`, "i").test(normalized)) {
      categorySlugs.push(cuisine);
      if (!kinds.includes("place")) {
        kinds.push("place");
      }
    }
  }

  if (/\bromantic\b/i.test(normalized)) {
    tagSlugs.push("romantic");
    preferences.push("romantic");
  }
  if (/\bwith friends\b/i.test(normalized)) {
    preferences.push("social");
  }

  let partySize: number | null = null;
  if (/\b(for two|for 2|a couple|my girlfriend|my boyfriend|my partner|my wife|my husband)\b/i.test(normalized)) {
    partySize = 2;
  }
  const partyCount = normalized.match(/\bfor (\d{1,2}) (?:people|guests|of us)\b/i);
  if (partyCount?.[1]) {
    partySize = Number(partyCount[1]);
  }

  let location: ParsedIntent["location"] = { mode: "selected", text: null };
  if (/\bnear me\b/i.test(normalized)) {
    location = { mode: "near_me", text: null };
  } else {
    const place = normalized.match(
      /\bin\s+([A-Za-z][A-Za-z .'-]{1,40}?)(?=\s+(?:this|next|on|for|under|tonight|saturday|sunday)\b|[?.!]|$)/i,
    );
    if (place?.[1]) {
      location = { mode: "text", text: place[1].trim() };
    }
  }

  let timeWindow: ParsedIntent["timeWindow"] = { kind: "none", weekday: null, timeOfDay: null };
  if (/\btonight\b/i.test(normalized)) {
    timeWindow = { kind: "tonight", weekday: null, timeOfDay: "evening" };
  } else if (/\bthis weekend\b/i.test(normalized)) {
    timeWindow = { kind: "weekend", weekday: null, timeOfDay: null };
  } else if (/\bsaturday\b/i.test(normalized)) {
    timeWindow = { kind: "weekday", weekday: 6, timeOfDay: null };
  } else if (/\bsunday\b/i.test(normalized)) {
    timeWindow = { kind: "weekday", weekday: 7, timeOfDay: null };
  }

  const budgetMatch = normalized.match(/\b(?:under|below|less than)\s*(₹|€|\$|£)?\s*([0-9][0-9,]*)\b/i);
  let budget: ParsedIntent["budget"] = null;
  if (budgetMatch?.[2]) {
    const currency = CURRENCY_SYMBOLS[budgetMatch[1] ?? ""] ?? "USD";
    const major = Number(budgetMatch[2].replace(/,/g, ""));
    if (Number.isFinite(major)) {
      budget = { amountMinor: toMinorUnits(major, currency), currency, basis: "total" };
    }
  }

  const topical = [...categorySlugs];
  const freeText = mode === "natural" ? topical.join(" ") || normalized : normalized;
  const confidence = kinds.length > 0 || budget || timeWindow.kind !== "none" || location.mode !== "selected" ? 0.84 : 0.55;

  return {
    schemaVersion: 1,
    interpreter: "rules",
    confidence,
    queryLanguage: locale,
    task: discover ? "discover" : "search",
    kinds: discover ? [] : unique(kinds),
    categorySlugs: discover ? [] : unique(categorySlugs),
    tagSlugs: unique(tagSlugs),
    freeText,
    location,
    radiusMeters: location.mode === "near_me" ? 5_000 : location.mode === "text" ? 15_000 : null,
    timeWindow,
    partySize,
    budget,
    preferences: unique(preferences),
  };
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
