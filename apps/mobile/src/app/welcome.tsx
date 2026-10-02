import { Stack } from "expo-router";
import { LandingScreen } from "../features/landing/LandingScreen";

export default function WelcomeRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          animation: "none",
          contentStyle: { backgroundColor: "#1A2330" },
          statusBarTranslucent: true,
          statusBarStyle: "light",
          navigationBarTranslucent: true,
          navigationBarColor: "#00000000",
        }}
      />
      <LandingScreen />
    </>
  );
}
