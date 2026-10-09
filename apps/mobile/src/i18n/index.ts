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

export function intlLocale(): "sv-SE" | "en-GB" {
  return i18n.language?.startsWith("sv") ? "sv-SE" : "en-GB";
}

export function titleCase(value: string): string {
  if (!value) return value;
  const locale = intlLocale();
  return value.charAt(0).toLocaleUpperCase(locale) + value.slice(1);
}

export { i18n };
export type { AppLanguage };
