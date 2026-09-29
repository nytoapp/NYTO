import * as SecureStore from "expo-secure-store";
import type { ApiEnvelope, ApiFailure } from "@atlas/contracts";
import { apiBaseUrl, requestTimeoutMs } from "../config/env";

const TOKEN_KEY = "atlas.accessToken";

export async function readAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function writeAccessToken(token: string | null): Promise<void> {
  if (!token) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<ApiEnvelope<T>> {
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
    return body;
  } catch {
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
  } finally {
    clearTimeout(timer);
  }
}
