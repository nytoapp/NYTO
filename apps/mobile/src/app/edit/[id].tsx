import { Stack } from "expo-router";
import { city } from "../../features/city/theme";
import { EditPlanScreen } from "../../features/plans/EditPlanScreen";

export default function EditPlanRoute() {
  return (
    <>
      <Stack.Screen options={{ contentStyle: { backgroundColor: city.page }, statusBarStyle: "dark" }} />
      <EditPlanScreen />
    </>
  );
}
