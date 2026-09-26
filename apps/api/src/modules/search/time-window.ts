import { DateTime } from "luxon";
import type { ParsedIntent, ResolvedTime } from "@atlas/contracts";

export function resolveTimeWindow(window: ParsedIntent["timeWindow"], zone: string, now = DateTime.now()): ResolvedTime {
  const local = now.setZone(zone);
  if (!local.isValid) {
    return { dateFrom: null, dateTo: null, timeOfDay: window.timeOfDay };
  }
  if (window.kind === "tonight") {
    const date = local.toISODate();
    return { dateFrom: date, dateTo: date, timeOfDay: "evening" };
  }
  if (window.kind === "weekend") {
    if (local.weekday === 7) {
      const date = local.toISODate();
      return { dateFrom: date, dateTo: date, timeOfDay: null };
    }
    const saturday = local.plus({ days: (6 - local.weekday + 7) % 7 }).startOf("day");
    return {
      dateFrom: saturday.toISODate(),
      dateTo: saturday.plus({ days: 1 }).toISODate(),
      timeOfDay: null,
    };
  }
  if (window.kind === "weekday" && window.weekday) {
    const date = local.plus({ days: (window.weekday - local.weekday + 7) % 7 }).toISODate();
    return { dateFrom: date, dateTo: date, timeOfDay: window.timeOfDay };
  }
  return { dateFrom: null, dateTo: null, timeOfDay: window.timeOfDay };
}
