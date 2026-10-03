import { Stack } from "expo-router";
import { city } from "../features/city/theme";
import { GuideScreen } from "../features/guide/GuideScreen";

export default function GuideRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
          contentStyle: { backgroundColor: city.paper },
          statusBarStyle: "dark",
        }}
      />
      <GuideScreen />
    </>
  );
}
