import { interestIds, type Account } from "@atlas/contracts";
import { apiRequest } from "../../api/client";
import { useAuth } from "./session";

export type { Account };

function asAccount(value: Partial<Account> | null | undefined): Account {
  const raw = Array.isArray(value?.interestIds) ? value.interestIds : [];
  const known = raw.filter((id): id is (typeof interestIds)[number] => (interestIds as readonly string[]).includes(id));
  return {
    displayName: typeof value?.displayName === "string" && value.displayName.trim() ? value.displayName : null,
    phoneE164: typeof value?.phoneE164 === "string" && value.phoneE164 ? value.phoneE164 : null,
    email: typeof value?.email === "string" && value.email ? value.email : null,
    interestIds: interestIds.filter((id) => known.includes(id)),
  };
}

export async function loadAccount(): Promise<Account> {
  const response = await apiRequest<Account>("/api/v1/account");
  if (response.error?.code === "AUTHENTICATION_REQUIRED" || response.error?.code === "UNAUTHORIZED") {
    await useAuth.getState().expire();
  }
  if (response.error || !response.data) {
    throw new Error(response.error?.message ?? "Couldn't load your account.");
  }
  return asAccount(response.data);
}

export async function saveDisplayName(displayName: string): Promise<Account> {
  return patchAccount({ displayName });
}

export async function saveInterests(ids: string[]): Promise<Account> {
  return patchAccount({ interestIds: interestIds.filter((id) => ids.includes(id)) });
}

async function patchAccount(body: { displayName?: string; interestIds?: string[] }): Promise<Account> {
  const response = await apiRequest<Account>("/api/v1/account", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (response.error || !response.data) {
    throw new Error(response.error?.message ?? "Couldn't save your account.");
  }
  return asAccount(response.data);
}
