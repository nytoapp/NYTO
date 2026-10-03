import { Stack } from "expo-router";
import { city } from "../../features/city/theme";
import { CategoryScreen } from "../../features/explore/CategoryScreen";

export default function CategoryRoute() {
  return (
    <>
      <Stack.Screen options={{ contentStyle: { backgroundColor: city.page }, statusBarStyle: "dark" }} />
      <CategoryScreen />
    </>
  );
}
