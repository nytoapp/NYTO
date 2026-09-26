import type { Observation } from "./dedupe";

export const defaultRankWeights = {
  text: 0.35,
  distance: 0.2,
  timeFit: 0.2,
  freshness: 0.1,
  confidence: 0.1,
  popularity: 0.05,
} as const;

export type RankWeights = { [Key in keyof typeof defaultRankWeights]: number };

export type RankedObservation = Observation & { reasons: string[]; score: number };

export function rankObservations(
  items: Observation[],
  input: {
    freeText: string;
    origin: { latitude: number; longitude: number } | null;
    weights?: RankWeights;
    now?: Date;
  },
): RankedObservation[] {
  const weights = input.weights ?? defaultRankWeights;
  const tokens = input.freeText.toLowerCase().split(/\s+/).filter(Boolean);
  const ranked = items.map((item) => {
    const text = textScore(item.title, tokens);
    const distance = distanceScore(item, input.origin);
    const fresh = freshnessScore(item, input.now ?? new Date());
    const score =
      text * weights.text +
      distance.value * weights.distance +
      0.5 * weights.timeFit +
      fresh * weights.freshness +
      item.confidence * weights.confidence +
      0.4 * weights.popularity;
    const reasons: string[] = [];
    if (distance.nearby) {
      reasons.push("nearby");
    }
    if (text > 0.6) {
      reasons.push("name-match");
    }
    return { ...item, reasons, score };
  });
  return ranked.sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));
}

function textScore(title: string, tokens: string[]): number {
  if (tokens.length === 0) {
    return 0.4;
  }
  const haystack = title.toLowerCase();
  const hits = tokens.filter((token) => haystack.includes(token)).length;
  return hits / tokens.length;
}

function distanceScore(
  item: Observation,
  origin: { latitude: number; longitude: number } | null,
): { value: number; nearby: boolean } {
  if (!origin || item.latitude === null || item.longitude === null) {
    return { value: 0.4, nearby: false };
  }
  const meters = haversine(origin, { latitude: item.latitude, longitude: item.longitude });
  const value = Math.max(0, 1 - meters / 20_000);
  return { value, nearby: meters <= 3_000 };
}

function freshnessScore(item: Observation, now: Date): number {
  if (item.state === "stale" || item.state === "unavailable") {
    return 0;
  }
  if (!item.expiresAt) {
    return 1;
  }
  return Date.parse(item.expiresAt) > now.getTime() ? 1 : 0;
}

function haversine(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const earth = 6_371_000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(a)));
}
