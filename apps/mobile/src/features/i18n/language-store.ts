import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { i18n, isAppLanguage, type AppLanguage } from "../../i18n";

const KEY = "cityday.language";

type LanguageState = {
  ready: boolean;
  language: AppLanguage;
  hydrate: () => Promise<void>;
  setLanguage: (language: AppLanguage) => Promise<void>;
};

export const useLanguage = create<LanguageState>((set) => ({
  ready: false,
  language: "en",
  hydrate: async () => {
    const stored = await SecureStore.getItemAsync(KEY);
    const language = isAppLanguage(stored) ? stored : "en";
    await i18n.changeLanguage(language);
    set({ ready: true, language });
  },
  setLanguage: async (language) => {
    await SecureStore.setItemAsync(KEY, language);
    await i18n.changeLanguage(language);
    set({ language });
  },
}));
