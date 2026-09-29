import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { apiRequest, readAccessToken, writeAccessToken } from "../../api/client";
import { useOnboarding, type Stage } from "../onboarding/store";

const STAGE_KEY = "cityday.stage";
const INTERESTS_KEY = "cityday.interests";

export type AuthStatus = "restoring" | "signedOut" | "signedIn";

type AuthState = {
  status: AuthStatus;
  restore: () => Promise<void>;
  refresh: () => Promise<void>;
  markSignedIn: () => void;
  signOut: () => Promise<void>;
};

function readInterests(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export const useAuth = create<AuthState>((set) => ({
  status: "restoring",
  restore: async () => {
    const [token, stageRaw, interestsRaw] = await Promise.all([
      readAccessToken(),
      SecureStore.getItemAsync(STAGE_KEY),
      SecureStore.getItemAsync(INTERESTS_KEY),
    ]);
    const interests = readInterests(interestsRaw);
    let stage: Stage = "welcome";
    if (token) {
      if (stageRaw === "interests") stage = "interests";
      else if (stageRaw === "app") stage = "app";
      else stage = interests.length > 0 ? "app" : "interests";
    } else if (stageRaw === "app" || stageRaw === "interests") {
      await SecureStore.setItemAsync(STAGE_KEY, "welcome");
    }
    useOnboarding.setState({ hydrated: true, stage, interests });
    set({ status: token ? "signedIn" : "signedOut" });
  },
  refresh: async () => {
    const token = await readAccessToken();
    set({ status: token ? "signedIn" : "signedOut" });
  },
  markSignedIn: () => set({ status: "signedIn" }),
  signOut: async () => {
    try {
      await apiRequest("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // Local sign-out still has to finish if the network is down.
    }
    await writeAccessToken(null);
    await SecureStore.setItemAsync(STAGE_KEY, "welcome");
    useOnboarding.setState({ stage: "welcome" });
    set({ status: "signedOut" });
  },
}));
