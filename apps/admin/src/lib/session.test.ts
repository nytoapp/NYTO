import { describe, expect, it } from "vitest";
import { clearSession, readSession, writeSession } from "./session";

function memory() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("admin session", () => {
  it("drops an expired access token", () => {
    const storage = memory();
    writeSession(storage, { accessToken: "token", userId: "user", expiresInSeconds: 60 }, 1_000);
    expect(readSession(storage, 1_000 + 61_000)).toBeNull();
  });

  it("clears the stored token", () => {
    const storage = memory();
    writeSession(storage, { accessToken: "token", userId: "user", expiresInSeconds: 60 }, 1_000);
    clearSession(storage);
    expect(readSession(storage, 1_000)).toBeNull();
  });
});
