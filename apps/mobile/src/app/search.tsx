import { Stack } from "expo-router";
import { city } from "../features/city/theme";
import { SearchScreen } from "../features/search/SearchScreen";

export default function SearchRoute() {
  return (
    <>
      <Stack.Screen options={{ contentStyle: { backgroundColor: city.page }, statusBarStyle: "dark" }} />
      <SearchScreen />
    </>
  );
}
