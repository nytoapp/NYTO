import { Stack } from "expo-router";
import { city } from "../features/city/theme";
import { ResultsScreen } from "../features/search/ResultsScreen";

export default function ResultsRoute() {
  return (
    <>
      <Stack.Screen options={{ contentStyle: { backgroundColor: city.page }, statusBarStyle: "dark" }} />
      <ResultsScreen />
    </>
  );
}
