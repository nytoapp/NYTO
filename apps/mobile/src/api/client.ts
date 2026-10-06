import * as SecureStore from "expo-secure-store";
import type { ApiEnvelope, ApiFailure, AuthSession } from "@atlas/contracts";
import { apiBaseUrl, requestTimeoutMs } from "../config/env";

const TOKEN_KEY = "atlas.accessToken";
const REFRESH_KEY = "atlas.refreshToken";

export async function readAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function writeAccessToken(token: string | null): Promise<void> {
  if (!token) {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
    await SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => undefined);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function writeSession(session: Pick<AuthSession, "accessToken" | "refreshToken">): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, session.accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, session.refreshToken);
}

let refreshing: Promise<boolean> | null = null;

function canRefresh(path: string): boolean {
  if (path === "/api/v1/auth/logout") return true;
  return !path.startsWith("/api/v1/auth/");
}

async function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = refreshSessionOnce().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function refreshSessionOnce(): Promise<boolean> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
  if (!refreshToken) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
    });
    const body = (await response.json()) as ApiEnvelope<AuthSession>;
    if (body.error || !body.data?.accessToken || !body.data.refreshToken) return false;
    await writeSession(body.data);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function offline<T>(): ApiEnvelope<T> {
  const failure: ApiFailure = {
    data: null,
    error: {
      code: "SERVICE_UNAVAILABLE",
      message: "We couldn't connect right now.",
      retryable: true,
      requestId: "unavailable",
    },
    meta: { requestId: "unavailable", correlationId: "unavailable", nextCursor: null, warnings: [] },
  };
  return failure;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, attempt = 0): Promise<ApiEnvelope<T>> {
  const token = await readAccessToken();
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  headers.set("accept", "application/json");
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers, signal: controller.signal });
    const body = (await response.json()) as ApiEnvelope<T>;
    const code = body.error?.code;
    if (attempt === 0 && canRefresh(path) && (code === "AUTHENTICATION_REQUIRED" || code === "UNAUTHORIZED")) {
      const renewed = await refreshSession();
      if (renewed) return apiRequest<T>(path, init, 1);
    }
    return body;
  } catch {
    return offline<T>();
  } finally {
    clearTimeout(timer);
  }
}
