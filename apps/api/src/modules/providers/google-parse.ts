import type { Observation } from "../search/dedupe";

type GooglePlace = {
  id?: unknown;
  displayName?: { text?: unknown };
  formattedAddress?: unknown;
  location?: { latitude?: unknown; longitude?: unknown };
  googleMapsLinks?: { placeUri?: unknown };
};

export function observationsFromPlacesBody(body: unknown, now = new Date()): Observation[] {
  if (!body || typeof body !== "object" || !Array.isArray((body as { places?: unknown }).places)) {
    throw new Error("malformed places payload");
  }
  const places = (body as { places: unknown[] }).places;
  const observations: Observation[] = [];
  for (const entry of places) {
    const place = entry as GooglePlace;
    if (typeof place.id !== "string" || !place.displayName || typeof place.displayName.text !== "string") {
      continue;
    }
    const latitude = typeof place.location?.latitude === "number" ? place.location.latitude : null;
    const longitude = typeof place.location?.longitude === "number" ? place.location.longitude : null;
    observations.push({
      provider: "google_places",
      externalId: place.id,
      subjectId: null,
      kind: "place",
      title: place.displayName.text,
      summary: typeof place.formattedAddress === "string" ? place.formattedAddress : null,
      latitude,
      longitude,
      attribution: [{ provider: "google_maps", text: "Google Maps", required: true }],
      confidence: 0.7,
      fetchedAt: now.toISOString(),
      expiresAt: null,
      state: "ok",
      destinationId: null,
      destinationLabel: typeof place.googleMapsLinks?.placeUri === "string" ? "View on Google Maps" : null,
      countryCode: null,
      categorySlugs: [],
      tagSlugs: [],
      startsAt: null,
      factSource: "provider",
    });
  }
  return observations;
}
