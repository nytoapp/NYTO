import { limits } from "@atlas/config";
import type { AdapterQuery, AdapterSearchResult, BuiltDestination, ProviderAdapter } from "../gateway";
import type { Observation } from "../../search/dedupe";

/** Development observations. Production configuration refuses to register this adapter. */
const FIXTURES: Observation[] = [
  {
    provider: "fixture",
    externalId: "018f5c3a-7c3a-7000-8000-0000000000b1",
    subjectId: "018f5c3a-7c3a-7000-8000-0000000000b1",
    kind: "place",
    title: "Osteria del Fixture",
    summary: "Fixture Italian restaurant in Paris. Not a real listing.",
    latitude: 48.858,
    longitude: 2.362,
    attribution: [{ provider: "fixture", text: "Fixture data", required: false }],
    confidence: 1,
    fetchedAt: new Date(0).toISOString(),
    expiresAt: null,
    state: "ok",
    destinationId: "018f5c3a-7c3a-7000-8000-0000000000f1",
    destinationLabel: "Visit website",
    countryCode: "FR",
    categorySlugs: ["restaurant", "italian"],
    tagSlugs: ["romantic"],
    startsAt: null,
    factSource: "provider",
  },
];

export class FixtureAdapter implements ProviderAdapter {
  readonly code = "fixture";
  readonly timeoutMs = limits.providerTimeoutMs;
  failMode: "none" | "timeout" | "unavailable" | "malformed" = "none";

  async search(_input: AdapterQuery, signal: AbortSignal): Promise<AdapterSearchResult> {
    if (this.failMode === "timeout") {
      await new Promise((_resolve, reject) => {
        const timer = setTimeout(() => reject(new DOMException("aborted", "AbortError")), 2_000);
        signal.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new DOMException("aborted", "AbortError"));
        });
      });
    }
    if (this.failMode === "unavailable") {
      throw new Error("fixture unavailable");
    }
    if (this.failMode === "malformed") {
      return {
        observations: [],
        warning: { code: "malformed", provider: this.code, message: "Fixture payload was malformed." },
      };
    }
    return { observations: FIXTURES.map((item) => ({ ...item, fetchedAt: new Date().toISOString() })), warning: null };
  }

  buildDestination(): Promise<BuiltDestination | null> {
    return Promise.resolve({
      label: "Visit website",
      preferredUrl: "https://example.com/fixture/osteria",
      fallbackUrl: "https://example.com/fixture/osteria",
      allowedHosts: ["example.com"],
      allowedSchemes: ["https"],
    });
  }
}
