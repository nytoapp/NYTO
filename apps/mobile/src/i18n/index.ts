import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources, type AppLanguage } from "./resources";

void i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources,
  interpolation: { escapeValue: false },
});

export function isAppLanguage(value: string | null | undefined): value is AppLanguage {
  return value === "en" || value === "sv";
}

export { i18n };
export type { AppLanguage };
