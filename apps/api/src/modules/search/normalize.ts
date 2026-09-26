export function normalizeQuery(input: string): string {
  let cleaned = "";
  for (const char of input.normalize("NFC")) {
    const code = char.codePointAt(0) ?? 0;
    cleaned += code <= 0x1f || code === 0x7f ? " " : char;
  }
  return cleaned.replace(/\s+/g, " ").trim().slice(0, 300).trim();
}

const NATURAL_PATTERN =
  /\b(what can i|find me|i want|tonight|this weekend|under|below|less than|romantic|with my|for my|saturday|sunday)\b/i;

export function classifyQuery(normalized: string): "standard" | "natural" {
  if (normalized.length === 0) {
    return "standard";
  }
  return NATURAL_PATTERN.test(normalized) ? "natural" : "standard";
}
