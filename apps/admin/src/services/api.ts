import type { ApiEnvelope } from "@atlas/contracts";

const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly requestId: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export function createApiClient(getToken: () => string | null) {
  return {
    async request<T>(path: string, init: RequestInit = {}): Promise<T> {
      const headers = new Headers(init.headers);
      headers.set("accept", "application/json");
      if (init.body) {
        headers.set("content-type", "application/json");
      }
      const token = getToken();
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8_000);
      let response: Response;
      try {
        response = await fetch(`${apiBase}${path}`, { ...init, headers, signal: controller.signal });
      } catch {
        throw new ApiRequestError("The operations API is unreachable. Check that it is running.", "NETWORK", "unavailable", 0);
      } finally {
        clearTimeout(timer);
      }
      let body: ApiEnvelope<T>;
      try {
        body = (await response.json()) as ApiEnvelope<T>;
      } catch {
        throw new ApiRequestError("The operations API returned an unreadable response.", "INVALID_RESPONSE", "unavailable", response.status);
      }
      if (body.error || body.data === null) {
        throw new ApiRequestError(
          body.error?.message ?? "The request could not be completed.",
          body.error?.code ?? "INTERNAL",
          body.error?.requestId ?? "unavailable",
          response.status,
          body.error?.details,
        );
      }
      return body.data;
    },
  };
}
