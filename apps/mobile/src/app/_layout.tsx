import "../i18n";
import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppErrorBoundary } from "../components/ErrorBoundary";
import { OfflineBanner } from "../components/OfflineBanner";
import { ThemeProvider } from "../components/theme/ThemeProvider";
import { queryClient } from "../lib/query-client";
import { useAuth } from "../features/auth/session";
import { revealApp } from "../features/landing/reveal";
import { useOnboarding } from "../features/onboarding/store";

void SplashScreen.preventAutoHideAsync();

function Startup() {
  const status = useAuth((state) => state.status);
  const restore = useAuth((state) => state.restore);
  const hydrated = useOnboarding((state) => state.hydrated);
  useEffect(() => {
    void restore();
  }, [restore]);
  useEffect(() => {
    if (status === "restoring" || !hydrated) return;
    const timer = setTimeout(revealApp, 1600);
    return () => clearTimeout(timer);
  }, [hydrated, status]);
  if (status === "restoring" || !hydrated) {
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
