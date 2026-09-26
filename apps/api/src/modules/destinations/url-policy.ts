const BLOCKED_PROTOCOLS = new Set(["javascript:", "data:", "file:", "blob:", "vbscript:"]);

export type UrlDecision = { ok: true; href: string } | { ok: false; reason: string };

export function validateDestinationUrl(
  raw: string,
  allowedHosts: readonly string[],
  allowedSchemes: readonly string[],
): UrlDecision {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: "unparseable" };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, reason: "userinfo" };
  }
  const protocol = parsed.protocol.toLowerCase();
  if (BLOCKED_PROTOCOLS.has(protocol) || protocol === "http:") {
    return { ok: false, reason: "scheme" };
  }
  const scheme = protocol.replace(":", "");
  if (!allowedSchemes.map((item) => item.toLowerCase().replace(":", "")).includes(scheme)) {
    return { ok: false, reason: "scheme" };
  }
  if (scheme !== "https") {
    return { ok: true, href: parsed.toString() };
  }
  const host = parsed.hostname.toLowerCase();
  if (isPrivateHost(host)) {
    return { ok: false, reason: "private-host" };
  }
  const allowed = allowedHosts.some((entry) => host === entry.toLowerCase());
  if (!allowed) {
    return { ok: false, reason: "host" };
  }
  return { ok: true, href: parsed.toString() };
}

function isPrivateHost(host: string): boolean {
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) {
    return false;
  }
  const a = Number(ipv4[1]);
  const b = Number(ipv4[2]);
  if (a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || a === 0) {
    return true;
  }
  return a === 169 && b === 254;
}
