import { Stack } from "expo-router";
import { InterestsScreen } from "../features/onboarding/InterestsScreen";

export default function InterestsRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          animation: "slide_from_right",
          contentStyle: { backgroundColor: "#F7F5F1" },
          statusBarStyle: "dark",
          statusBarTranslucent: true,
          navigationBarColor: "#F7F5F1",
        }}
      />
      <InterestsScreen />
    </>
  );
}
