export type PlaceWriteStatus = "draft" | "active" | "unavailable";

export function statusAfterWrite(archived: boolean, requested: PlaceWriteStatus): "draft" | "active" | "unavailable" | "deleted" {
  return archived ? "deleted" : requested;
}

export function placeTransition(
  action: "archive" | "restore",
  archived: boolean,
): { apply: false } | { apply: true; status: "deleted" | "draft" } | { conflict: true } {
  if (action === "archive") {
    return archived ? { apply: false } : { apply: true, status: "deleted" };
  }
  return archived ? { apply: true, status: "draft" } : { conflict: true };
}
