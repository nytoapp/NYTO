import type { ParsedIntent } from "./intent";

export type ResultFilterGroup = "intent" | "time" | "availability" | "ranking" | "distance";

export type ResultFilter = {
  key: string;
  label: string;
  group: ResultFilterGroup;
  selected: boolean;
  phrase: string | null;
};

const groupOrder: Record<ResultFilterGroup, number> = {
  intent: 0,
  time: 1,
  availability: 2,
  ranking: 3,
  distance: 4,
};

function containsPhrase(query: string, phrase: string): boolean {
  const body = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = phrase.includes(" ") ? `\\b${body}\\b` : `\\b${body}s?\\b`;
  return new RegExp(pattern, "i").test(query);
}

export function removeFilterPhrase(query: string, phrase: string): string {
  const body = phrase.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = phrase.includes(" ") ? `\\b${body}\\b` : `\\b${body}s?\\b`;
  return query.replace(new RegExp(pattern, "gi"), " ").replace(/\s+/g, " ").trim();
}

export function buildResultFilters(input: {
  query: string;
  intent: ParsedIntent | null;
  sort: "recommended" | "nearby";
}): ResultFilter[] {
  const query = input.query.replace(/\s+/g, " ").trim();
  const filters = new Map<string, ResultFilter>();
  const add = (filter: ResultFilter) => {
    if (!filters.has(filter.key)) filters.set(filter.key, filter);
  };
  const intent = input.intent;

  if (intent) {
    for (const slug of intent.categorySlugs) {
      const phrase = slug.replace(/-/g, " ");
      add({ key: `category:${slug}`, label: phrase, group: "intent", selected: true, phrase });
    }
    if (intent.partySize) {
      add({
        key: `party:${intent.partySize}`,
        label: `${intent.partySize} people`,
        group: "intent",
        selected: true,
        phrase: String(intent.partySize),
      });
    }
    if (intent.budget) {
      add({ key: "budget", label: "Budget", group: "intent", selected: true, phrase: "cheap" });
    }
    if (intent.timeWindow.kind === "tonight") {
      add({ key: "tonight", label: "Tonight", group: "time", selected: true, phrase: "tonight" });
    }
    if (intent.timeWindow.kind === "weekend") {
      add({ key: "weekend", label: "This weekend", group: "time", selected: true, phrase: "weekend" });
    }
    if (intent.location.mode === "near_me") {
      add({ key: "near_me", label: "Near me", group: "distance", selected: true, phrase: "near me" });
    }
  }

  add({
    key: "tonight",
    label: "Tonight",
    group: "time",
    selected: containsPhrase(query, "tonight"),
    phrase: "tonight",
  });
  add({
    key: "open_now",
    label: "Open now",
    group: "availability",
    selected: containsPhrase(query, "open now"),
    phrase: "open now",
  });
  add({
    key: "recommended",
    label: "Recommended",
    group: "ranking",
    selected: input.sort === "recommended",
    phrase: null,
  });
  add({
    key: "nearby",
    label: "Nearby",
    group: "distance",
    selected: input.sort === "nearby",
    phrase: null,
  });

  return [...filters.values()].sort((left, right) => groupOrder[left.group] - groupOrder[right.group]);
}
