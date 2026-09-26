import { createHmac, timingSafeEqual } from "node:crypto";
import { limits } from "@atlas/config";

export type DestinationHandle = {
  provider: string;
  externalId: string;
  action: string;
  exp: number;
};

export function signDestinationHandle(handle: Omit<DestinationHandle, "exp">, secret: string, now = Date.now()): string {
  const payload: DestinationHandle = {
    ...handle,
    exp: now + limits.destinationHandleTtlSeconds * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function readDestinationHandle(token: string, secret: string, now = Date.now()): DestinationHandle | null {
  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }
  const [body, signature] = parts;
  if (!body || !signature) {
    return null;
  }
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as DestinationHandle;
    if (!parsed.provider || !parsed.externalId || !parsed.action || typeof parsed.exp !== "number") {
      return null;
    }
    if (parsed.exp < now) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
