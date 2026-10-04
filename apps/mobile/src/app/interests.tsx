import { Stack } from "expo-router";
import { InterestsScreen } from "../features/onboarding/InterestsScreen";
import { color } from "../features/city/theme";

export default function InterestsRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          animation: "slide_from_right",
          contentStyle: { backgroundColor: color.background },
          statusBarStyle: "dark",
          statusBarTranslucent: true,
          navigationBarColor: color.background,
        }}
      />
      <InterestsScreen />
    </>
  );
}
