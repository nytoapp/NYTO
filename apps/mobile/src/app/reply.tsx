import { Stack } from "expo-router";
import { city } from "../features/city/theme";
import { ReplyScreen } from "../features/guide/ReplyScreen";

export default function ReplyRoute() {
  return (
    <>
      <Stack.Screen options={{ contentStyle: { backgroundColor: city.page }, statusBarStyle: "dark" }} />
      <ReplyScreen />
    </>
  );
}
