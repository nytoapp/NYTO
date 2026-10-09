import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams, useRouter } from "expo-router";
import { leave } from "../nav/leave";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CityText, EmptyState, GuideFab } from "../city/chrome";
import { SubjectResultCard } from "../city/cards";
import { city, citySpace } from "../city/theme";
import { friendlyError } from "../../lib/errors";
import { catalogName } from "../i18n/labels";
import { useSearch } from "../search/useSearch";

export function CategoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = typeof id === "string" ? id.replace(/-/g, " ") : "";
  const search = useSearch();

  useEffect(() => {
    if (query) search.mutate(query);
  }, [query, search.mutate]);

  const results = search.isSuccess && Array.isArray(search.data?.data?.results) ? search.data.data.results : [];

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 96 }}>
        <View style={styles.top}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("common.back")} onPress={() => leave(router, "/")} style={styles.back}>
            <Ionicons name="chevron-back" size={24} color={city.ink} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t("home.map")} onPress={() => router.push({ pathname: "/map", params: { q: query } })}>
            <CityText size="meta">{t("home.map")}</CityText>
          </Pressable>
        </View>
        <View style={styles.pad}>
          <CityText size="display">{query ? catalogName(query, t) : t("explore.title")}</CityText>
        </View>
        <View style={styles.list}>
          {search.isPending ? <View style={styles.skeleton} /> : null}
          {search.isError ? <EmptyState title={t("category.failed")} body={friendlyError(search.error)} action={t("common.tryAgain")} onAction={() => search.mutate(query)} /> : null}
          {search.isSuccess && results.length === 0 ? <EmptyState title={t("category.empty")} body={t("category.emptyBody")} /> : null}
          {results.map((item) => (
            <SubjectResultCard key={item.id} item={item} />
          ))}
        </View>
      </ScrollView>
      <GuideFab from={query ? catalogName(query, t) : t("explore.title")} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: city.page },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  pad: { paddingHorizontal: citySpace.page, marginBottom: 12 },
  list: { paddingHorizontal: citySpace.page, gap: 12 },
  skeleton: { height: 92, borderRadius: 16, backgroundColor: city.photo },
});
