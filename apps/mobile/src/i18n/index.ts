import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { I18nManager } from "react-native";

const en = {
  searchPlaceholder: "Search places, events, ideas",
  homeGreeting: "What do you want to do?",
  emptyResults: "Nothing matched",
  emptyResultsBody: "Try a city, a kind of place, or a broader idea.",
  offline: "You are offline",
  offlineBody: "Reconnect to search. Saved provider details are not kept on this device.",
  signInToSave: "Sign in to save this.",
  signIn: "Sign in",
  partial: "Some results could not be loaded.",
  authRequired: "Sign in to continue.",
};

const language = getLocales()[0]?.languageCode ?? "en";
const rtl = ["ar", "he", "fa", "ur"].includes(language);
I18nManager.allowRTL(true);
if (rtl && !I18nManager.isRTL) {
  I18nManager.forceRTL(true);
}

void i18n.use(initReactI18next).init({
  lng: language,
  fallbackLng: "en",
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
});

export { i18n };
