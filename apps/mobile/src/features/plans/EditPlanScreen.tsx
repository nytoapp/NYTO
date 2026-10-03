import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

export function EditPlanScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  useEffect(() => {
    if (typeof id === "string" && id !== "draft") router.replace(`/trip/${id}`);
    else router.replace("/(tabs)/trips");
  }, [id, router]);
  return <View />;
}
