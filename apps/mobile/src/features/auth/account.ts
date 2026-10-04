import { apiRequest } from "../../api/client";
import { useAuth } from "./session";

export type Account = {
  displayName: string | null;
  phoneE164: string | null;
  email: string | null;
};

export async function loadAccount(): Promise<Account> {
  const response = await apiRequest<Account>("/api/v1/account");
  if (response.error?.code === "AUTHENTICATION_REQUIRED" || response.error?.code === "UNAUTHORIZED") {
    await useAuth.getState().expire();
  }
  if (response.error || !response.data) {
    throw new Error(response.error?.message ?? "Couldn't load your account.");
  }
  return response.data;
}

export async function saveDisplayName(displayName: string): Promise<Account> {
  const response = await apiRequest<Account>("/api/v1/account", {
    method: "PATCH",
    body: JSON.stringify({ displayName }),
  });
  if (response.error || !response.data) {
    throw new Error(response.error?.message ?? "Couldn't save your name.");
  }
  return response.data;
}
