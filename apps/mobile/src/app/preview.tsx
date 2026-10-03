import { Stack } from "expo-router";
import { city } from "../features/city/theme";
import { PlanPreviewScreen } from "../features/plans/PlanPreviewScreen";

export default function PreviewRoute() {
  return (
    <>
      <Stack.Screen options={{ contentStyle: { backgroundColor: city.page }, statusBarStyle: "dark" }} />
      <PlanPreviewScreen />
    </>
  );
}
