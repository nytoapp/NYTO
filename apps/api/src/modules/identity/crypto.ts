import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import { argon2id, argon2Verify } from "hash-wasm";
import { SignJWT, jwtVerify } from "jose";
import { limits } from "@atlas/config";

export async function hashPassword(password: string): Promise<string> {
  return argon2id({
    password,
    salt: randomBytes(16),
    parallelism: 1,
    iterations: 2,
    memorySize: 19_456,
    hashLength: 32,
    outputType: "encoded",
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return argon2Verify({ password, hash });
}

export function hashOtp(code: string, pepper: string): string {
  return createHash("sha256").update(`${pepper}:${code}`).digest("hex");
}

export function newOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function newRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string, pepper: string): string {
  return createHash("sha256").update(`${pepper}:${token}`).digest("hex");
}

export async function signAccessToken(secret: string, userId: string, sessionId: string): Promise<string> {
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${limits.accessTokenTtlSeconds}s`)
    .sign(new TextEncoder().encode(secret));
}

export async function readAccessToken(secret: string, token: string): Promise<{ userId: string; sessionId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string") {
      return null;
    }
    return { userId: payload.sub, sessionId: payload.sid };
  } catch {
    return null;
  }
}

export function newId(): string {
  return randomUUID();
}
