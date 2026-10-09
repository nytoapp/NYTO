import { apiRequest } from "../../api/client";
import { intlLocale, titleCase } from "../../i18n";
import { useAuth } from "../auth/session";

export type TripRow = {
  id: string;
  title: string;
  startsOn: string;
  endsOn: string;
  timezone: string;
  destinationLabel: string;
  itemCount: number;
  status: "current" | "upcoming" | "past";
  stops: { title: string; slot: string }[];
};

export const dayParts = [
  { id: "morning", label: "Morning", hint: "Before noon", query: "coffee", slot: "morning", slots: ["morning", "lunch"] },
  { id: "afternoon", label: "Afternoon", hint: "Midday", query: "things to do", slot: "afternoon", slots: ["afternoon"] },
  { id: "evening", label: "Evening", hint: "After five", query: "restaurants", slot: "dinner", slots: ["dinner", "night", "unscheduled"] },
] as const;

export function civilDateInZone(timezone: string, offsetDays: number): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return shiftCivilDate(today, offsetDays);
}

export function shiftCivilDate(iso: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function civilParts(value: string): { weekday: string; weekdayShort: string; day: string; month: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return { weekday: value, weekdayShort: value, day: "", month: "" };
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const locale = intlLocale();
  return {
    weekday: titleCase(new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(date)),
    weekdayShort: titleCase(new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(date)),
    day: String(date.getUTCDate()),
    month: titleCase(new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(date)),
  };
}

export function stopsForPart(stops: { title: string; slot: string }[], partId: (typeof dayParts)[number]["id"]): string[] {
  const part = dayParts.find((item) => item.id === partId);
  if (!part) return [];
  return stops.filter((stop) => (part.slots as readonly string[]).includes(stop.slot)).map((stop) => stop.title);
}

/** The trips query has been cached as either a list or `{ items }`. Accept both. */
export function readTripList(data: unknown): TripRow[] {
  const rows = Array.isArray(data) ? data : data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items) ? (data as { items: unknown[] }).items : [];
  return rows.filter((item): item is TripRow => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return (
      typeof row.id === "string" &&
      typeof row.title === "string" &&
      typeof row.startsOn === "string" &&
      typeof row.endsOn === "string" &&
      typeof row.timezone === "string" &&
      typeof row.destinationLabel === "string"
    );
  }).map((row) => ({
    ...row,
    itemCount: typeof (row as { itemCount?: unknown }).itemCount === "number" ? (row as { itemCount: number }).itemCount : 0,
    status: (row as { status?: unknown }).status === "past" || (row as { status?: unknown }).status === "upcoming" ? (row as { status: "past" | "upcoming" }).status : "current",
    stops: Array.isArray((row as { stops?: unknown }).stops)
      ? ((row as { stops: unknown[] }).stops.filter((stop) => stop && typeof stop === "object" && typeof (stop as { title?: unknown }).title === "string" && typeof (stop as { slot?: unknown }).slot === "string") as { title: string; slot: string }[])
      : [],
  }));
}

export async function loadTrips(): Promise<TripRow[]> {
  const response = await apiRequest<unknown>("/api/v1/trips");
  if (response.error?.code === "AUTHENTICATION_REQUIRED" || response.error?.code === "UNAUTHORIZED") {
    await useAuth.getState().expire();
  }
  if (response.error || !response.data) {
    throw new Error(response.error?.message ?? "Plans could not be loaded.");
  }
  return readTripList(response.data);
}
