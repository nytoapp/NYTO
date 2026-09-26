export function haversineMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const earth = 6_371_000;
  const lat1 = radians(from.latitude);
  const lat2 = radians(to.latitude);
  const dLat = radians(to.latitude - from.latitude);
  const dLng = radians(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(a)));
}

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export type LocationCandidate = {
  id: string;
  label: string;
  countryCode: string;
  timezone: string;
  latitude: number;
  longitude: number;
};

export function chooseLocation(
  candidates: LocationCandidate[],
  biasCountry: string | null,
): { type: "one"; location: LocationCandidate } | { type: "ambiguous"; candidates: LocationCandidate[] } | { type: "none" } {
  const narrowed = biasCountry
    ? candidates.filter((candidate) => candidate.countryCode.toUpperCase() === biasCountry.toUpperCase())
    : candidates;
  const pool = narrowed.length > 0 ? narrowed : candidates;
  const first = pool[0];
  if (!first) {
    return { type: "none" };
  }
  if (pool.length === 1) {
    return { type: "one", location: first };
  }
  return { type: "ambiguous", candidates: pool };
}
