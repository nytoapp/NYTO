import { Stack } from "expo-router";
import { MapScreen } from "../features/explore/MapScreen";

export default function MapRoute() {
  return (
    <>
      <Stack.Screen options={{ contentStyle: { backgroundColor: "#E7E1D6" }, statusBarStyle: "dark" }} />
      <MapScreen />
    </>
  );
}
