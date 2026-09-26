import { minorUnitExponent, toMinorUnits } from "@atlas/config/money";
import { placeWriteSchema, type PlaceDetail, type PlaceWrite } from "@atlas/contracts";

export const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export type HourDraft = { weekday: string; opensLocal: string; closesLocal: string; spansNextDay: boolean };
export type MediaDraft = { url: string; alt: string };
export type AttributeDraft = { key: string; value: string };

export type PlaceDraft = {
  name: string;
  summary: string;
  status: "draft" | "active" | "unavailable";
  locale: string;
  categoryId: string;
  subcategoryId: string;
  tagIds: string[];
  countryCode: string;
  timezone: string;
  latitude: string;
  longitude: string;
  streetLine: string;
  locality: string;
  adminArea: string;
  postalCode: string;
  phoneE164: string;
  websiteUrl: string;
  priceAmount: string;
  priceCurrency: string;
  priceBasis: "" | "per_person" | "per_night" | "total";
  hours: HourDraft[];
  media: MediaDraft[];
  attributes: AttributeDraft[];
  providerCode: string;
  externalId: string;
};

export function emptyDraft(): PlaceDraft {
  return {
    name: "",
    summary: "",
    status: "draft",
    locale: "en",
    categoryId: "",
    subcategoryId: "",
    tagIds: [],
    countryCode: "",
    timezone: "",
    latitude: "",
    longitude: "",
    streetLine: "",
    locality: "",
    adminArea: "",
    postalCode: "",
    phoneE164: "",
    websiteUrl: "",
    priceAmount: "",
    priceCurrency: "",
    priceBasis: "",
    hours: [],
    media: [],
    attributes: [],
    providerCode: "",
    externalId: "",
  };
}

export function draftFromDetail(place: PlaceDetail): PlaceDraft {
  return {
    ...emptyDraft(),
    name: place.name === "Untitled" ? "" : place.name,
    summary: place.summary ?? "",
    status: place.status === "deleted" ? "draft" : place.status,
    locale: place.locale,
    categoryId: place.categoryId ?? "",
    subcategoryId: place.subcategoryId ?? "",
    tagIds: place.tagIds,
    countryCode: place.countryCode,
    timezone: place.timezone,
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    streetLine: place.streetLine ?? "",
    locality: place.locality ?? "",
    adminArea: place.adminArea ?? "",
    postalCode: place.postalCode ?? "",
    phoneE164: place.phoneE164 ?? "",
    websiteUrl: place.websiteUrl ?? "",
    priceAmount: place.price ? fromMinor(place.price.amountMinor, place.price.currency) : "",
    priceCurrency: place.price?.currency ?? "",
    priceBasis: place.price?.basis ?? "",
    hours: place.hours.map((hour) => ({
      weekday: String(hour.weekday),
      opensLocal: hour.opensLocal,
      closesLocal: hour.closesLocal,
      spansNextDay: hour.spansNextDay,
    })),
    media: place.media.map((item) => ({ url: item.url, alt: item.alt ?? "" })),
    attributes: Object.entries(place.attributes).map(([key, value]) => ({ key, value: String(value) })),
    providerCode: "",
    externalId: "",
  };
}

export function compilePlaceDraft(draft: PlaceDraft): { ok: true; value: PlaceWrite } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const price = compilePrice(draft, errors);
  const provider = compileProvider(draft, errors);
  if (Object.keys(errors).length > 0 || price === "invalid" || provider === "invalid") {
    return { ok: false, errors };
  }
  const parsed = placeWriteSchema.safeParse({
    name: draft.name,
    summary: emptyToNull(draft.summary),
    status: draft.status,
    locale: draft.locale || "en",
    categoryId: draft.categoryId,
    subcategoryId: emptyToNull(draft.subcategoryId),
    tagIds: draft.tagIds,
    countryCode: draft.countryCode,
    timezone: draft.timezone,
    latitude: numberOrBlank(draft.latitude),
    longitude: numberOrBlank(draft.longitude),
    streetLine: emptyToNull(draft.streetLine),
    locality: emptyToNull(draft.locality),
    adminArea: emptyToNull(draft.adminArea),
    postalCode: emptyToNull(draft.postalCode),
    phoneE164: emptyToNull(draft.phoneE164),
    websiteUrl: emptyToNull(draft.websiteUrl),
    price,
    hours: draft.hours.map((hour) => ({
      weekday: Number(hour.weekday),
      opensLocal: hour.opensLocal,
      closesLocal: hour.closesLocal,
      spansNextDay: hour.spansNextDay,
    })),
    media: draft.media
      .filter((item) => item.url.trim() || item.alt.trim())
      .map((item) => ({ url: item.url.trim(), alt: emptyToNull(item.alt) })),
    attributes: Object.fromEntries(draft.attributes.filter((item) => item.key.trim()).map((item) => [item.key.trim(), item.value])),
    providerReference: provider,
  });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] ? String(issue.path[0]) : "form";
      errors[key] ??= issue.message;
    }
    return { ok: false, errors };
  }
  return { ok: true, value: parsed.data };
}

function compilePrice(draft: PlaceDraft, errors: Record<string, string>): PlaceWrite["price"] | null | "invalid" {
  const amount = draft.priceAmount.trim();
  const currency = draft.priceCurrency.trim().toUpperCase();
  const basis = draft.priceBasis;
  if (!amount && !currency && !basis) {
    return null;
  }
  if (!amount || !currency || !basis) {
    errors.price = "Enter an amount, currency, and basis, or leave price empty.";
    return "invalid";
  }
  const major = Number(amount);
  if (!Number.isFinite(major) || major < 0) {
    errors.price = "Enter a price of zero or more.";
    return "invalid";
  }
  return { amountMinor: toMinorUnits(major, currency), currency, basis };
}

function compileProvider(draft: PlaceDraft, errors: Record<string, string>): PlaceWrite["providerReference"] | null | "invalid" {
  const providerCode = draft.providerCode.trim();
  const externalId = draft.externalId.trim();
  if (!providerCode && !externalId) {
    return null;
  }
  if (!providerCode || !externalId) {
    errors.providerReference = "Enter both a provider and an external id, or leave both empty.";
    return "invalid";
  }
  return { providerCode, externalId };
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function numberOrBlank(value: string): number {
  if (value.trim() === "") {
    return Number.NaN;
  }
  return Number(value);
}

function fromMinor(minor: number, currency: string): string {
  const exponent = minorUnitExponent(currency);
  return (minor / 10 ** exponent).toFixed(exponent);
}
