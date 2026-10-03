import { Stack } from "expo-router";
import { city } from "../../features/city/theme";
import { NeighborhoodScreen } from "../../features/explore/NeighborhoodScreen";

export default function NeighborhoodRoute() {
  return (
    <>
      <Stack.Screen options={{ contentStyle: { backgroundColor: city.page }, statusBarStyle: "light" }} />
      <NeighborhoodScreen />
    </>
  );
}
