import { Stack } from "expo-router";
import { city } from "../features/city/theme";
import { JourneyScreen } from "../features/explore/JourneyScreen";

export default function JourneyRoute() {
  return (
    <>
      <Stack.Screen options={{ contentStyle: { backgroundColor: city.page }, statusBarStyle: "light" }} />
      <JourneyScreen />
    </>
  );
}
