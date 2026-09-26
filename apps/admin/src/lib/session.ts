const KEY = "ops.access.v1";

export type ClientSession = {
  accessToken: string;
  userId: string;
  expiresAtMs: number;
};

type SessionStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readSession(storage: Pick<Storage, "getItem">, now = Date.now()): ClientSession | null {
  const raw = storage.getItem(KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ClientSession>;
    if (!parsed.accessToken || !parsed.userId || typeof parsed.expiresAtMs !== "number" || parsed.expiresAtMs <= now) {
      return null;
    }
    return { accessToken: parsed.accessToken, userId: parsed.userId, expiresAtMs: parsed.expiresAtMs };
  } catch {
    return null;
  }
}

export function writeSession(
  storage: Pick<Storage, "setItem">,
  session: { accessToken: string; userId: string; expiresInSeconds: number },
  now = Date.now(),
): ClientSession {
  const stored: ClientSession = {
    accessToken: session.accessToken,
    userId: session.userId,
    expiresAtMs: now + session.expiresInSeconds * 1000,
  };
  storage.setItem(KEY, JSON.stringify(stored));
  return stored;
}

export function clearSession(storage: Pick<Storage, "removeItem">): void {
  storage.removeItem(KEY);
}

export function browserStorage(): SessionStore {
  return sessionStorage;
}
