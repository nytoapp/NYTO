import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

export function ReplyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const query = typeof params.q === "string" ? params.q : "";
  useEffect(() => {
    router.replace({ pathname: "/results", params: { q: query } });
  }, [query, router]);
  return <View />;
}
