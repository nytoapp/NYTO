import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const STAGE_KEY = "cityday.stage";
const INTERESTS_KEY = "cityday.interests";

export type Stage = "welcome" | "interests" | "app";

type OnboardingState = {
  hydrated: boolean;
  stage: Stage;
  interests: string[];
  hydrate: () => Promise<void>;
  setStage: (stage: Stage) => Promise<void>;
  setInterests: (ids: string[]) => Promise<void>;
  enterApp: (ids: string[]) => Promise<void>;
  enterGuest: () => void;
};

export const useOnboarding = create<OnboardingState>((set) => ({
  hydrated: false,
  stage: "welcome",
  interests: [],
  hydrate: async () => {
    const [stage, raw] = await Promise.all([SecureStore.getItemAsync(STAGE_KEY), SecureStore.getItemAsync(INTERESTS_KEY)]);
    let interests: string[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          interests = parsed.filter((item): item is string => typeof item === "string");
        }
      } catch {
        interests = [];
      }
    }
    const next: Stage = stage === "interests" || stage === "app" ? stage : "welcome";
    set({ hydrated: true, stage: next, interests });
  },
  setStage: async (stage) => {
    await SecureStore.setItemAsync(STAGE_KEY, stage);
    set({ stage });
  },
  setInterests: async (ids) => {
    await SecureStore.setItemAsync(INTERESTS_KEY, JSON.stringify(ids));
    set({ interests: ids });
  },
  enterApp: async (ids) => {
    await SecureStore.setItemAsync(INTERESTS_KEY, JSON.stringify(ids));
    await SecureStore.setItemAsync(STAGE_KEY, "app");
    set({ interests: ids, stage: "app" });
  },
  enterGuest: () => {
    set({ stage: "app" });
  },
}));
