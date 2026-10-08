import "../i18n";
import { useEffect } from "react";
import { BackHandler } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppErrorBoundary } from "../components/ErrorBoundary";
import { OfflineBanner } from "../components/OfflineBanner";
import { ThemeProvider } from "../components/theme/ThemeProvider";
import { queryClient } from "../lib/query-client";
import { useAuth } from "../features/auth/session";
import { useSignInDraft } from "../features/auth/sign-in-draft";
import { useLanguage } from "../features/i18n/language-store";
import { revealApp } from "../features/landing/reveal";
import { useDiscoveryLocation } from "../features/location/location-store";
import { dismiss } from "../features/nav/leave";
import { useOnboarding } from "../features/onboarding/store";

void SplashScreen.preventAutoHideAsync();

function Startup() {
  const status = useAuth((state) => state.status);
  const restore = useAuth((state) => state.restore);
  const hydrated = useOnboarding((state) => state.hydrated);
  const hydrateLocation = useDiscoveryLocation((state) => state.hydrate);
  const languageReady = useLanguage((state) => state.ready);
  const hydrateLanguage = useLanguage((state) => state.hydrate);
  const draftReady = useSignInDraft((state) => state.ready);
  const hydrateDraft = useSignInDraft((state) => state.hydrate);
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => dismiss(router, pathname));
    return () => subscription.remove();
  }, [pathname, router]);
  useEffect(() => {
    void restore();
    void hydrateLocation();
    void hydrateLanguage();
    void hydrateDraft();
  }, [hydrateDraft, hydrateLanguage, hydrateLocation, restore]);
  useEffect(() => {
    if (status === "restoring" || !hydrated || !languageReady) return;
    const timer = setTimeout(revealApp, 1600);
    return () => clearTimeout(timer);
  }, [hydrated, languageReady, status]);
  if (status === "restoring" || !hydrated || !languageReady || !draftReady) {
    return null;
  }
  return (
    <>
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          contentStyle: { backgroundColor: "#F6F3EE" },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <Startup />
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}
