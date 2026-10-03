import { Stack } from "expo-router";
import { city } from "../../features/city/theme";
import { TripDetailScreen } from "../../features/trips/TripDetailScreen";

export default function TripRoute() {
  return (
    <>
      <Stack.Screen options={{ contentStyle: { backgroundColor: city.page }, statusBarStyle: "dark" }} />
      <TripDetailScreen />
    </>
  );
}
