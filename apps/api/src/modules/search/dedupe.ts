import { limits } from "@atlas/config";
import type { CatalogKind } from "@atlas/contracts";
import { haversineMeters } from "../geo/choose-location";

export type Observation = {
  provider: string;
  externalId: string;
  subjectId: string | null;
  kind: CatalogKind;
  title: string;
  summary: string | null;
  latitude: number | null;
  longitude: number | null;
  attribution: { provider: string; text: string; required: boolean }[];
  confidence: number;
  fetchedAt: string;
  expiresAt: string | null;
  state: "ok" | "unavailable" | "stale" | "unknown";
  destinationId: string | null;
  destinationLabel: string | null;
  countryCode: string | null;
  categorySlugs: string[];
  tagSlugs: string[];
  startsAt: string | null;
  factSource: "catalog" | "provider";
};

export function dedupeObservations(items: Observation[]): Observation[] {
  const groups: Observation[][] = [];
  for (const item of items) {
    const group = groups.find((existing) => existing.some((candidate) => sameIdentity(candidate, item)));
    if (group) {
      group.push(item);
    } else {
      groups.push([item]);
    }
  }
  return groups.map((group) => {
    const ranked = [...group].sort((left, right) => right.confidence - left.confidence);
    const primary = ranked[0];
    if (!primary) {
      throw new Error("Dedupe group was empty");
    }
    return primary;
  });
}

function sameIdentity(left: Observation, right: Observation): boolean {
  if (left.subjectId && left.subjectId === right.subjectId && left.provider === right.provider) {
    return left.externalId === right.externalId;
  }
  if (left.subjectId && left.subjectId === right.subjectId) {
    return true;
  }
  if (left.provider === right.provider && left.externalId === right.externalId) {
    return true;
  }
  if (normalizeName(left.title) !== normalizeName(right.title)) {
    return false;
  }
  if (left.latitude === null || left.longitude === null || right.latitude === null || right.longitude === null) {
    return false;
  }
  return (
    haversineMeters(
      { latitude: left.latitude, longitude: left.longitude },
      { latitude: right.latitude, longitude: right.longitude },
    ) <= limits.dedupeDistanceMeters
  );
}

function normalizeName(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
