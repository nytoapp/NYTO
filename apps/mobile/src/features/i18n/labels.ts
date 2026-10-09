import type { TFunction } from "i18next";

const catalogKey: Record<string, string> = {
  Restaurants: "catalog.restaurants",
  Italian: "catalog.italian",
  Cafes: "catalog.cafes",
  Hotels: "catalog.hotels",
  Movies: "catalog.movies",
  Concerts: "catalog.concerts",
  Nightlife: "catalog.nightlife",
  Bars: "catalog.bars",
  Culture: "catalog.culture",
  Museums: "catalog.museums",
  Attractions: "catalog.attractions",
  Activities: "catalog.activities",
  Experiences: "catalog.experiences",
  "Parks & Outdoors": "catalog.parks",
  Shopping: "catalog.shopping",
  Wellness: "catalog.wellness",
  Events: "catalog.events",
  French: "catalog.french",
  Japanese: "catalog.japanese",
  Indian: "catalog.indian",
  Chinese: "catalog.chinese",
  Mexican: "catalog.mexican",
  Thai: "catalog.thai",
  Korean: "catalog.korean",
  Spanish: "catalog.spanish",
  Greek: "catalog.greek",
  Coffee: "catalog.coffee",
  "Italian restaurants": "catalog.italianRestaurants",
  "Things to do": "catalog.things",
};

const ideaKey: Record<string, string> = {
  "Italian restaurants": "ideas.italian",
  Coffee: "ideas.coffee",
  Museums: "ideas.museums",
  Nightlife: "ideas.nightlife",
  Shopping: "ideas.shopping",
  "Things to do": "ideas.things",
};

const filterKey: Record<string, string> = {
  Budget: "filters.budget",
  Tonight: "filters.tonight",
  "This weekend": "filters.weekend",
  "Near me": "filters.near",
  "Open now": "filters.open",
  Recommended: "filters.recommended",
  Nearby: "filters.nearby",
};

const kindKey: Record<string, string> = {
  place: "kind.place",
  event: "kind.event",
  activity: "kind.activity",
  experience: "kind.experience",
  media: "kind.media",
  accommodation: "kind.accommodation",
};

const interestIds = ["food", "music", "culture", "outdoors", "shopping", "nightlife", "activities", "wellness", "surprise"];

function named(english: string, table: Record<string, string>, t: TFunction): string | null {
  const direct = table[english];
  if (direct) return t(direct);
  const needle = english.toLocaleLowerCase();
  for (const [name, key] of Object.entries(table)) {
    if (name.toLocaleLowerCase() === needle) return t(key);
  }
  return null;
}

export function catalogName(english: string, t: TFunction): string {
  return named(english, catalogKey, t) ?? named(english, ideaKey, t) ?? english;
}

export function ideaName(english: string, t: TFunction): string {
  return named(english, ideaKey, t) ?? catalogName(english, t);
}

export function englishQuery(text: string, t: TFunction): string {
  const trimmed = text.trim();
  const needle = trimmed.toLocaleLowerCase();
  for (const [english, key] of Object.entries({ ...catalogKey, ...ideaKey })) {
    if (english.toLocaleLowerCase() === needle || t(key).toLocaleLowerCase() === needle) return english;
  }
  return trimmed;
}

export function filterName(label: string, t: TFunction): string {
  return named(label, filterKey, t) ?? catalogName(label, t);
}

export function homeRailTitle(title: string, city: string | null, t: TFunction): string {
  if (city && title === `In ${city}`) return t("home.inCity", { city });
  if (title === "Places to start") return t("home.placesToStart");
  return title;
}

export function interestLabel(id: string, t: TFunction): string {
  return interestIds.includes(id) ? t(`interests.${id}`) : id;
}

export function partLabel(id: string, t: TFunction): string {
  if (id === "morning" || id === "afternoon") return t(`plans.part.${id}`);
  if (id === "evening" || id === "dinner") return t("plans.part.evening");
  return id;
}

export function partHint(id: string, t: TFunction): string {
  if (id === "morning" || id === "afternoon" || id === "evening") return t(`plans.hint.${id}`);
  if (id === "dinner") return t("plans.hint.evening");
  return "";
}

export function kindName(kind: string, t: TFunction): string {
  const key = kindKey[kind];
  return key ? t(key) : kind.slice(0, 1).toUpperCase() + kind.slice(1);
}

export function placeCount(count: number, t: TFunction): string {
  return count === 1 ? t("plans.one") : t("plans.many", { count });
}

const sentenceKey: Record<string, string> = {
  "Nothing came through. Give it another try.": "errors.generic",
  "The screen failed to load": "errors.screen",
  "The request could not be completed.": "errors.request",
  "Couldn't save your name.": "name.failed",
  "No account for this number. Create an account.": "auth.noAccount",
  "This number already has an account. Log in.": "auth.hasAccount",
  "Sign in to continue.": "auth.signIn",
  "CITYDAY does not have opening hours, so open now cannot be applied.": "notices.hours",
  "Opening hours are not in CITYDAY, so these places are not filtered by open now.": "notices.hoursFilter",
  "Enter a place, event, or idea.": "notices.empty",
  "Some catalog results could not be loaded.": "notices.partial",
  "Search is temporarily unavailable. Try again.": "notices.searchDown",
  "I can build that once CITYDAY has enough places and experiences in this city.": "guide.planning",
  "CITYDAY does not have a hidden-gem list for this city yet.": "guide.gems",
  "CITYDAY does not have date-night picks for this city yet.": "guide.date",
  "CITYDAY does not have scheduled events for this city yet.": "guide.events",
  "Open website": "place.website",
  "That link is not available.": "book.link",
};

/** Translates a known app sentence. Anything else, including a venue name, is returned unchanged. */
export function appSentence(message: string, t: TFunction): string {
  const key = sentenceKey[message.trim()];
  return key ? t(key) : message;
}
