import Constants from "expo-constants";

const configured = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

function devHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost ?? null;
  if (!hostUri) {
    return null;
  }
  const host = hostUri.split(":")[0];
  if (!host || host === "localhost" || host === "127.0.0.1") {
    return null;
  }
  return host;
}

function resolveApiBaseUrl(value: string): string {
  try {
    const url = new URL(value);
    const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const host = devHost();
    if (loopback && host) {
      url.hostname = host;
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return value;
  }
}

export const apiBaseUrl = resolveApiBaseUrl(configured);
export const requestTimeoutMs = 5_000;
