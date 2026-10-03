import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

export function PlanPreviewScreen() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/(tabs)/trips");
  }, [router]);
  return <View />;
}
