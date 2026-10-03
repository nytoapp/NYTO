import { Stack } from "expo-router";
import { city } from "../../features/city/theme";
import { BookingScreen } from "../../features/place/BookingScreen";

export default function BookRoute() {
  return (
    <>
      <Stack.Screen options={{ contentStyle: { backgroundColor: city.page }, statusBarStyle: "dark" }} />
      <BookingScreen />
    </>
  );
}
