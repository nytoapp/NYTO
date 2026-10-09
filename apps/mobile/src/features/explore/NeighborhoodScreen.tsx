import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, useRouter } from "expo-router";
import { leave } from "../nav/leave";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CityText, EmptyState } from "../city/chrome";
import { SubjectResultCard } from "../city/cards";
import { city, citySpace } from "../city/theme";
import { useSearch } from "../search/useSearch";

export function NeighborhoodScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const name = typeof id === "string" ? id.replace(/-/g, " ") : "";
  const search = useSearch();

  useEffect(() => {
    if (name) search.mutate(name);
  }, [name, search.mutate]);

  const results = search.isSuccess && Array.isArray(search.data?.data?.results) ? search.data.data.results : [];

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32, paddingHorizontal: citySpace.page }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("common.back")} onPress={() => leave(router, "/")} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={city.ink} />
        </Pressable>
        <CityText size="display">{name}</CityText>
        <CityText tone="muted">{t("area.body")}</CityText>
        <View style={styles.list}>
          {search.isError ? <EmptyState title={t("area.failed")} body={t("area.failedBody")} action={t("common.tryAgain")} onAction={() => search.mutate(name)} /> : null}
          {search.isSuccess && results.length === 0 ? <EmptyState title={t("area.empty")} body={t("area.emptyBody")} /> : null}
          {results.map((item) => (
            <SubjectResultCard key={item.id} item={item} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: city.page },
  back: { width: 44, height: 44, justifyContent: "center" },
  list: { marginTop: 20, gap: 12 },
});
