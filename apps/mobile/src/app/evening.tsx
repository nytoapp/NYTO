import { Stack } from "expo-router";
import { city } from "../features/city/theme";
import { EveningScreen } from "../features/guide/EveningScreen";

export default function EveningRoute() {
  return (
    <>
      <Stack.Screen options={{ contentStyle: { backgroundColor: city.page }, statusBarStyle: "dark" }} />
      <EveningScreen />
    </>
  );
}
