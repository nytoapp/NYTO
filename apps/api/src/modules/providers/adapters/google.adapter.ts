import { limits } from "@atlas/config";
import { observationsFromPlacesBody } from "../google-parse";
import type { AdapterQuery, AdapterSearchResult, BuiltDestination, ProviderAdapter } from "../gateway";

const FIELD_MASK = "places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsLinks";

export class GooglePlacesAdapter implements ProviderAdapter {
  readonly code = "google_places";
  readonly timeoutMs = limits.providerTimeoutMs;

  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async search(input: AdapterQuery, signal: AbortSignal): Promise<AdapterSearchResult> {
    if (!this.apiKey) {
      return { observations: [], warning: null };
    }
    try {
      const response = await this.fetchImpl("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.apiKey,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify({
          textQuery: input.text,
          maxResultCount: 10,
          languageCode: input.locale,
        }),
        signal,
      });
      if (!response.ok) {
        return { observations: [], warning: { code: "unavailable", provider: this.code, message: "Google Places did not respond." } };
      }
      const body: unknown = await response.json();
      const observations = observationsFromPlacesBody(body).map((item) => ({
        ...item,
        destinationLabel: "View on Google Maps",
      }));
      return { observations, warning: null };
    } catch (error) {
      if (error instanceof Error && error.message === "malformed places payload") {
        return { observations: [], warning: { code: "malformed", provider: this.code, message: "Google Places returned an unexpected payload." } };
      }
      throw error;
    }
  }

  async buildDestination(input: { externalId: string; action: string }, signal: AbortSignal): Promise<BuiltDestination | null> {
    if (!this.apiKey) {
      return null;
    }
    const response = await this.fetchImpl(`https://places.googleapis.com/v1/places/${encodeURIComponent(input.externalId)}`, {
      headers: {
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": "googleMapsLinks.placeUri",
      },
      signal,
    });
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as { googleMapsLinks?: { placeUri?: unknown } };
    const placeUri = body.googleMapsLinks?.placeUri;
    if (typeof placeUri !== "string") {
      return null;
    }
    return {
      label: "View on Google Maps",
      preferredUrl: placeUri,
      fallbackUrl: placeUri,
      allowedHosts: ["www.google.com", "maps.google.com", "google.com"],
      allowedSchemes: ["https"],
    };
  }
}
