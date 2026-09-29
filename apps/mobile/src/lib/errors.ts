export function friendlyError(error: unknown, fallback = "Nothing came through. Give it another try."): string {
  const message = error instanceof Error ? error.message : "";
  const lowered = message.toLowerCase();
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
    return fallback;
  }
  return message;
}
