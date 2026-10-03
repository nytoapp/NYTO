import { Stack, useLocalSearchParams } from "expo-router";
import { city } from "../../features/city/theme";
import { SubjectScreen } from "../../features/subject/SubjectScreen";

export default function PlaceRoute() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] ?? "" : params.id ?? "";
  return (
    <>
      <Stack.Screen options={{ contentStyle: { backgroundColor: city.page }, statusBarStyle: "light" }} />
      <SubjectScreen id={id} />
    </>
  );
}
