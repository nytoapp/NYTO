import { Stack, useLocalSearchParams } from "expo-router";
import { AccountInfoScreen } from "../features/profile/AccountInfoScreen";
import { color } from "../features/city/theme";

export default function InfoRoute() {
  const params = useLocalSearchParams<{ topic?: string }>();
  const topic = typeof params.topic === "string" ? params.topic : "";
  return (
    <>
      <Stack.Screen
        options={{
          animation: "slide_from_right",
          contentStyle: { backgroundColor: color.background },
          statusBarStyle: "dark",
          statusBarTranslucent: true,
          navigationBarColor: color.background,
        }}
      />
      <AccountInfoScreen topic={topic} />
    </>
  );
}
