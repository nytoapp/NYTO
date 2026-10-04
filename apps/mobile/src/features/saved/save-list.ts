import { apiRequest } from "../../api/client";
import { useAuth } from "../auth/session";

export type SaveRow = { id: string; subjectId: string };

/** The saves query has been cached as either a list or `{ items }`. Accept both. */
export function readSaveList(data: unknown): SaveRow[] {
  const rows = Array.isArray(data) ? data : data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items) ? (data as { items: unknown[] }).items : [];
  return rows.filter((item): item is SaveRow => {
    if (!item || typeof item !== "object") return false;
    const row = item as { id?: unknown; subjectId?: unknown };
    return typeof row.id === "string" && typeof row.subjectId === "string";
  });
}

export async function loadSaves(): Promise<SaveRow[]> {
  const response = await apiRequest<unknown>("/api/v1/saves");
  if (response.error?.code === "AUTHENTICATION_REQUIRED" || response.error?.code === "UNAUTHORIZED") {
    await useAuth.getState().expire();
  }
  if (response.error || !response.data) {
    throw new Error(response.error?.message ?? "Saves could not be loaded.");
  }
  return readSaveList(response.data);
}
