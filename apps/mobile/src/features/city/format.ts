import type { ParsedIntent, SearchResult } from "@atlas/contracts";
import type { TFunction } from "i18next";
import { intlLocale, titleCase } from "../../i18n";
import { catalogName, kindName } from "../i18n/labels";

const zeroDecimal = new Set(["JPY", "KRW", "VND"]);

export function formatPrice(price: SearchResult["price"]): string | null {
  if (!price) return null;
  const major = price.amountMinor / 10 ** (zeroDecimal.has(price.currency) ? 0 : 2);
  try {
    return new Intl.NumberFormat(intlLocale(), { style: "currency", currency: price.currency, maximumFractionDigits: zeroDecimal.has(price.currency) ? 0 : 0 }).format(major);
  } catch {
    return null;
  }
}

export function formatDistance(meters: number | null): string | null {
  if (meters === null || !Number.isFinite(meters)) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

export function kindLabel(kind: string): string {
  if (kind === "accommodation") return "Stay";
  if (kind === "place") return "Place";
  return kind.slice(0, 1).toUpperCase() + kind.slice(1);
}

export function subjectMeta(item: SearchResult, t: TFunction): string {
  const category = item.category ? catalogName(item.category, t) : kindName(item.kind, t);
  return [category, item.locality, formatDistance(item.distanceMeters), formatPrice(item.price)].filter(Boolean).join(" · ");
}

export function intentChips(intent: ParsedIntent | null): { id: string; label: string; phrase: string }[] {
  if (!intent) return [];
  const chips: { id: string; label: string; phrase: string }[] = [];
  if (intent.timeWindow.kind === "tonight") chips.push({ id: "tonight", label: "Tonight", phrase: "tonight" });
  if (intent.timeWindow.kind === "weekend") chips.push({ id: "weekend", label: "This weekend", phrase: "weekend" });
  if (intent.location.mode === "near_me") chips.push({ id: "near", label: "Near me", phrase: "near me" });
  if (intent.budget) chips.push({ id: "budget", label: "Budget", phrase: "cheap" });
  if (intent.partySize) chips.push({ id: "party", label: `${intent.partySize} people`, phrase: String(intent.partySize) });
  for (const slug of intent.categorySlugs) {
    chips.push({ id: slug, label: slug.replace(/-/g, " "), phrase: slug.replace(/-/g, " ") });
  }
  return chips;
}

export function isCatalogId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function localHour(timeZone: string | null): number {
  const hour = new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: timeZone ?? undefined }).format(new Date());
  return Number(hour);
}

export function localWeekday(timeZone: string | null): string {
  const locale = intlLocale();
  const name = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: timeZone ?? undefined }).format(new Date());
  return titleCase(name);
}

export function weekdayName(index: number): string {
  const date = new Date(Date.UTC(1970, 0, 4 + index));
  const locale = intlLocale();
  const name = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(date);
  return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
}
