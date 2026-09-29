import "../i18n";
import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppErrorBoundary } from "../components/ErrorBoundary";
import { OfflineBanner } from "../components/OfflineBanner";
import { ThemeProvider } from "../components/theme/ThemeProvider";
import { colors } from "../components/theme/tokens";
import { queryClient } from "../lib/query-client";
import { useAuth } from "../features/auth/session";
import { SplashView } from "../features/onboarding/SplashView";
import { useOnboarding } from "../features/onboarding/store";

function Startup() {
  const status = useAuth((state) => state.status);
  const restore = useAuth((state) => state.restore);
  const hydrated = useOnboarding((state) => state.hydrated);
  useEffect(() => {
    void restore();
  }, [restore]);
  if (status === "restoring" || !hydrated) {
    return <SplashView />;
  }
  return (
    <>
      <StatusBar style="light" />
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", contentStyle: { backgroundColor: colors.background } }} />
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
