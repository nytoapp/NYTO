import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const KEY = "cityday.signIn";

export type SignInDraft = {
  mode: "login" | "create";
  countryIso: string | null;
  national: string;
  hinting: boolean;
};

type DraftState = {
  ready: boolean;
  draft: SignInDraft | null;
  hydrate: () => Promise<void>;
};

export const useSignInDraft = create<DraftState>((set) => ({
  ready: false,
  draft: null,
  hydrate: async () => {
    const raw = await SecureStore.getItemAsync(KEY);
    set({ ready: true, draft: readDraft(raw) });
  },
}));

export async function saveSignInDraft(draft: SignInDraft): Promise<void> {
  useSignInDraft.setState({ draft, ready: true });
  await SecureStore.setItemAsync(KEY, JSON.stringify(draft));
}

export async function clearSignInDraft(): Promise<void> {
  useSignInDraft.setState({ draft: null, ready: true });
  await SecureStore.deleteItemAsync(KEY).catch(() => undefined);
}

function readDraft(raw: string | null): SignInDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SignInDraft>;
    if (parsed.mode !== "login" && parsed.mode !== "create") return null;
    return {
      mode: parsed.mode,
      countryIso: typeof parsed.countryIso === "string" ? parsed.countryIso : null,
      national: typeof parsed.national === "string" ? parsed.national : "",
      hinting: parsed.hinting === true,
    };
  } catch {
    return null;
  }
}
