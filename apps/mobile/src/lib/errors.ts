import { i18n } from "../i18n";
import { appSentence } from "../features/i18n/labels";

export function friendlyError(error: unknown, fallback?: string): string {
  const message = error instanceof Error ? error.message : "";
  const lowered = message.toLowerCase();
  const safe = fallback ?? i18n.t("errors.generic");
  if (
    !message ||
    lowered.includes("localhost") ||
    lowered.includes("127.0.0.1") ||
    lowered.includes("network") ||
    lowered.includes("fetch") ||
    lowered.includes("abort") ||
    lowered.includes("json") ||
    lowered.includes("exception") ||
    message.length > 160
  ) {
    return safe;
  }
  return appSentence(message, i18n.t);
}
