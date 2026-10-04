import { apiRequest } from "../../api/client";
import { useAuth } from "../auth/session";

export type TripRow = {
  id: string;
  title: string;
  startsOn: string;
  endsOn: string;
  timezone: string;
  destinationLabel: string;
};

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
  });
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
