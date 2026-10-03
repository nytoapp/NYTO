/** Legacy mock catalog. No live screen imports this module. Safe to remove after Batch 1 review. */
export type CityName = "Bengaluru" | "Paris";

export type Place = {
  id: string;
  city: CityName;
  title: string;
  category: string;
  neighborhood: string;
  summary: string;
  image: string;
  rating: string;
  reviews: string;
  price: string;
  kind: "place" | "event";
  when?: string;
  times: string[];
  interest: string;
};

export type Neighborhood = {
  id: string;
  city: CityName;
  title: string;
  summary: string;
  image: string;
  placeIds: string[];
};

const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=80`;

export const places: Place[] = [
  {
    id: "tutto-bello",
    city: "Bengaluru",
    title: "Tutto Bello",
    category: "Italian",
    neighborhood: "Indiranagar",
    summary: "A quiet dining room for long dinners, handmade pasta, and a short, confident wine list.",
    image: photo("photo-1414235077428-338989a2e8c0"),
    rating: "4.7",
    reviews: "128",
    price: "$$$",
    kind: "place",
    times: ["18:30", "19:00", "20:30", "21:00"],
    interest: "food",
  },
  {
    id: "du-claudio",
    city: "Bengaluru",
    title: "Du Claudio",
    category: "Italian",
    neighborhood: "Indiranagar",
    summary: "Candlelit tables, a short seasonal menu, and the kind of service that never hurries you.",
    image: photo("photo-1559339352-11d035aa65de"),
    rating: "4.6",
    reviews: "86",
    price: "$$$",
    kind: "place",
    times: ["19:00", "19:30", "20:30"],
    interest: "food",
  },
  {
    id: "bocca",
    city: "Bengaluru",
    title: "Bocca",
    category: "Restaurant",
    neighborhood: "Indiranagar",
    summary: "Wood fire, shared plates, and a room that works as well for two as it does for a table of friends.",
    image: photo("photo-1550966871-3ed3cdb5ed0c"),
    rating: "4.5",
    reviews: "210",
    price: "$$",
    kind: "place",
    times: ["18:30", "19:30", "21:00"],
    interest: "food",
  },
  {
    id: "olive-oak",
    city: "Bengaluru",
    title: "Olive & Oak",
    category: "Cafe",
    neighborhood: "Indiranagar",
    summary: "Morning light, serious coffee, and pastries worth building a walk around.",
    image: photo("photo-1495474472287-4d71bcdd2085"),
    rating: "4.6",
    reviews: "340",
    price: "$$",
    kind: "place",
    times: ["08:30", "09:00", "10:30"],
    interest: "food",
  },
  {
    id: "ngma",
    city: "Bengaluru",
    title: "National Gallery of Modern Art",
    category: "Museum",
    neighborhood: "Cubbon Park",
    summary: "A calm sequence of galleries inside the old gardens. Best in the late afternoon.",
    image: photo("photo-1554907984-15263bfd63bd"),
    rating: "4.6",
    reviews: "980",
    price: "$",
    kind: "place",
    times: ["11:00", "14:00", "16:00"],
    interest: "culture",
  },
  {
    id: "visvesvaraya",
    city: "Bengaluru",
    title: "Visvesvaraya Industrial Museum",
    category: "Museum",
    neighborhood: "Cubbon Park",
    summary: "Engines, engines, and the pleasure of wandering without a plan.",
    image: photo("photo-1566127444979-b3d2b654e3d7"),
    rating: "4.5",
    reviews: "2.1k",
    price: "$",
    kind: "place",
    times: ["10:30", "13:00", "15:30"],
    interest: "culture",
  },
  {
    id: "cubbon",
    city: "Bengaluru",
    title: "Cubbon Park",
    category: "Outdoors",
    neighborhood: "Cubbon Park",
    summary: "The city's green room. Walk it before dinner, not after.",
    image: photo("photo-1441974231531-c6227db76b6e"),
    rating: "4.8",
    reviews: "6.4k",
    price: "Free",
    kind: "place",
    times: ["07:00", "16:30", "18:00"],
    interest: "outdoors",
  },
  {
    id: "third-wave",
    city: "Bengaluru",
    title: "Third Wave",
    category: "Cafe",
    neighborhood: "Indiranagar",
    summary: "A reliable table, good light, and coffee that does not try too hard.",
    image: photo("photo-1501339847302-ac426a4a7cbb"),
    rating: "4.4",
    reviews: "1.2k",
    price: "$$",
    kind: "place",
    times: ["09:00", "11:00", "16:00"],
    interest: "food",
  },
  {
    id: "rooftop-social",
    city: "Bengaluru",
    title: "Rooftop Social",
    category: "Bar",
    neighborhood: "Indiranagar",
    summary: "Open air, a short cocktail list, and the city at a comfortable volume.",
    image: photo("photo-1470337458703-46ad1756a187"),
    rating: "4.4",
    reviews: "540",
    price: "$$",
    kind: "place",
    times: ["19:00", "20:00", "21:30"],
    interest: "nightlife",
  },
  {
    id: "indie-nights",
    city: "Bengaluru",
    title: "Indie Nights",
    category: "Live music",
    neighborhood: "Indiranagar",
    summary: "A small room, a local bill, and a start time that is actually the start time.",
    image: photo("photo-1511671782779-c97d3d27a1d4"),
    rating: "4.7",
    reviews: "190",
    price: "$$",
    kind: "event",
    when: "Tonight · 21:30",
    times: ["21:30"],
    interest: "music",
  },
  {
    id: "brand-affair",
    city: "Bengaluru",
    title: "100ft Boutiques",
    category: "Shopping",
    neighborhood: "Indiranagar",
    summary: "Independent shops along the main stretch. Go with one thing in mind, leave with two.",
    image: photo("photo-1441986300917-64674bd600d8"),
    rating: "4.3",
    reviews: "410",
    price: "$$",
    kind: "place",
    times: ["12:00", "15:00", "17:00"],
    interest: "shopping",
  },
  {
    id: "yoga-house",
    city: "Bengaluru",
    title: "Still House",
    category: "Wellness",
    neighborhood: "Indiranagar",
    summary: "A quiet studio for an hour that does not ask you to perform.",
    image: photo("photo-1544161515-4ab6ce6db874"),
    rating: "4.8",
    reviews: "260",
    price: "$$",
    kind: "place",
    times: ["07:30", "18:00"],
    interest: "wellness",
  },
  {
    id: "seine-walk",
    city: "Paris",
    title: "Left Bank walk",
    category: "Outdoors",
    neighborhood: "Saint-Germain",
    summary: "Bookshops, a long coffee, and the river when the light turns.",
    image: photo("photo-1502602898657-3e91760cbb34"),
    rating: "4.9",
    reviews: "8.1k",
    price: "Free",
    kind: "place",
    times: ["10:00", "16:00", "18:30"],
    interest: "outdoors",
  },
  {
    id: "saint-germain-table",
    city: "Paris",
    title: "Table Saint-Germain",
    category: "Restaurant",
    neighborhood: "Saint-Germain",
    summary: "A small dining room for one perfect meal, not a tour of the menu.",
    image: photo("photo-1466978913421-dad2ebd01d17"),
    rating: "4.6",
    reviews: "640",
    price: "$$$",
    kind: "place",
    times: ["19:00", "20:00", "21:00"],
    interest: "food",
  },
  {
    id: "musee-orsay",
    city: "Paris",
    title: "Musée d'Orsay",
    category: "Museum",
    neighborhood: "Saint-Germain",
    summary: "Arrive when it opens. The clocks and the river light are the point.",
    image: photo("photo-1499856871958-5b9627545d1a"),
    rating: "4.8",
    reviews: "42k",
    price: "$$",
    kind: "place",
    times: ["09:30", "13:00", "16:00"],
    interest: "culture",
  },
  {
    id: "pigalle-night",
    city: "Paris",
    title: "Pigalle hour",
    category: "Nightlife",
    neighborhood: "Pigalle",
    summary: "One bar, one room of music, then home. The city is better when you leave early.",
    image: photo("photo-1514933651103-005eec06c04b"),
    rating: "4.4",
    reviews: "1.1k",
    price: "$$",
    kind: "place",
    times: ["20:00", "21:30"],
    interest: "nightlife",
  },
];

export const neighborhoods: Neighborhood[] = [
  {
    id: "indiranagar",
    city: "Bengaluru",
    title: "Indiranagar",
    summary: "Trendy cafés, great food, and nightlife that stays on the street.",
    image: photo("photo-1517248135467-4c7edcad34c4"),
    placeIds: ["olive-oak", "tutto-bello", "bocca", "rooftop-social", "indie-nights", "brand-affair"],
  },
  {
    id: "cubbon-park",
    city: "Bengaluru",
    title: "Cubbon Park",
    summary: "Gardens, galleries, and the slow part of the city.",
    image: photo("photo-1500530855697-b586d89ba3ee"),
    placeIds: ["cubbon", "ngma", "visvesvaraya"],
  },
  {
    id: "saint-germain",
    city: "Paris",
    title: "Saint-Germain",
    summary: "Cafés, galleries, and a walk that does not need a destination.",
    image: photo("photo-1502602898657-3e91760cbb34"),
    placeIds: ["seine-walk", "saint-germain-table", "musee-orsay"],
  },
];

export const categories = [
  { id: "restaurants", label: "Restaurants", query: "restaurant" },
  { id: "cafes", label: "Cafes", query: "cafe" },
  { id: "bars", label: "Bars", query: "bar" },
  { id: "nightlife", label: "Nightlife", query: "nightlife" },
  { id: "events", label: "Events", query: "event" },
  { id: "activities", label: "Activities", query: "activities" },
  { id: "museums", label: "Museums", query: "museum" },
  { id: "parks", label: "Parks & Nature", query: "outdoors" },
  { id: "shopping", label: "Shopping", query: "shopping" },
  { id: "wellness", label: "Wellness", query: "wellness" },
  { id: "date", label: "Date ideas", query: "dinner" },
] as const;

export const suggestedSearches = [
  "Italian restaurant",
  "Date night",
  "Rooftop bar",
  "Things to do this weekend",
  "Live music",
  "Coffee",
  "Museum",
] as const;

export function cityFromLabel(label: string | null | undefined): CityName {
  return label === "Paris" ? "Paris" : "Bengaluru";
}

export function placesForCity(label: string | null | undefined): Place[] {
  const city = cityFromLabel(label);
  return places.filter((place) => place.city === city);
}

export function placeById(id: string): Place | undefined {
  return places.find((place) => place.id === id);
}

export function neighborhoodById(id: string): Neighborhood | undefined {
  return neighborhoods.find((item) => item.id === id);
}

export function neighborhoodsForCity(label: string | null | undefined): Neighborhood[] {
  const city = cityFromLabel(label);
  return neighborhoods.filter((item) => item.city === city);
}

const stopWords = new Set(["the", "and", "for", "this", "with", "near", "things", "that", "your", "from"]);

function haystack(place: Place): string {
  return [place.title, place.category, place.neighborhood, place.summary, place.interest, place.kind, place.price].join(" ").toLowerCase();
}

function intentMatch(place: Place, needle: string): boolean {
  if ((needle.includes("tonight") || needle.includes("weekend") || needle.includes("happening")) && (place.kind === "event" || place.interest === "nightlife" || place.interest === "music")) return true;
  if ((needle.includes("romantic") || needle.includes("date")) && (place.interest === "food" || place.category === "Bar")) return true;
  if ((needle.includes("cheap") || needle.includes("free")) && (place.price === "$" || place.price === "Free")) return true;
  if ((needle.includes("brunch") || needle.includes("coffee")) && place.category === "Cafe") return true;
  if ((needle.includes("music") || needle.includes("live")) && place.interest === "music") return true;
  if (needle.includes("friend") && (place.interest === "nightlife" || place.interest === "food" || place.interest === "music")) return true;
  if (needle.includes("rooftop") && place.title.toLowerCase().includes("rooftop")) return true;
  if (needle.includes("museum") && place.category === "Museum") return true;
  if ((needle.includes("dinner") || needle.includes("italian") || needle.includes("restaurant")) && (place.category === "Italian" || place.category === "Restaurant")) return true;
  return false;
}

export function searchPlaces(query: string, label: string | null | undefined): Place[] {
  const needle = query.trim().toLowerCase();
  const pool = placesForCity(label);
  if (!needle) return pool;
  const tokens = needle.split(/[^a-z0-9]+/).filter((token) => token.length > 2 && !stopWords.has(token));
  const matched = pool.filter((place) => {
    if (intentMatch(place, needle)) return true;
    const text = haystack(place);
    return tokens.some((token) => text.includes(token));
  });
  return matched;
}

const categoryMatch: Record<string, (place: Place) => boolean> = {
  restaurants: (place) => place.category === "Italian" || place.category === "Restaurant",
  cafes: (place) => place.category === "Cafe",
  bars: (place) => place.category === "Bar",
  nightlife: (place) => place.interest === "nightlife" || place.category === "Bar" || place.category === "Nightlife",
  events: (place) => place.kind === "event",
  activities: (place) => place.interest === "outdoors" || place.interest === "activities",
  museums: (place) => place.category === "Museum",
  parks: (place) => place.interest === "outdoors",
  shopping: (place) => place.interest === "shopping",
  wellness: (place) => place.interest === "wellness",
  date: (place) => place.interest === "food" || place.interest === "music" || place.category === "Bar",
};

export function categoryPlaces(categoryId: string, label: string | null | undefined): Place[] {
  const pool = placesForCity(label);
  const match = categoryMatch[categoryId];
  return match ? pool.filter(match) : pool;
}

export function guideCollections(query: string, label: string | null | undefined): { id: string; title: string; summary: string; items: Place[] }[] {
  const pool = placesForCity(label);
  const matched = searchPlaces(query, label);
  const source = matched.length >= 3 ? matched : pool;
  const take = (start: number) => {
    const items: Place[] = [];
    for (let index = 0; index < source.length && items.length < 3; index += 1) {
      const place = source[(start + index) % source.length];
      if (place && !items.some((item) => item.id === place.id)) items.push(place);
    }
    return items;
  };
  return [
    { id: "classic", title: "Classic", summary: "The reliable version of the day.", items: take(0) },
    { id: "local", title: "Local & relaxed", summary: "Slower, closer, and less of a performance.", items: take(1) },
    { id: "different", title: "Something different", summary: "One turn off the obvious route.", items: take(2) },
  ];
}
