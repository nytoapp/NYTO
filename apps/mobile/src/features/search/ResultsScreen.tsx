import type { SearchResult } from "@atlas/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CityText, EmptyState, GuideFab } from "../city/chrome";
import { SubjectResultCard } from "../city/cards";
import { intentChips } from "../city/format";
import { city, citySpace } from "../city/theme";
import { friendlyError } from "../../lib/errors";
import { useSearch } from "./useSearch";

const extras = ["tonight", "open now"] as const;

export function ResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string }>();
  const initial = typeof params.q === "string" ? params.q : "";
  const [query, setQuery] = useState(initial);
  const [sort, setSort] = useState<"Recommended" | "Nearby">("Recommended");
  const search = useSearch();

  useEffect(() => {
    setQuery(initial);
  }, [initial]);

  useEffect(() => {
    if (query.trim()) search.mutate(query);
  }, [query, search.mutate]);

  const payload = search.data?.data;
  const chips = intentChips(payload?.interpretation ?? null);
  const results = useMemo(() => {
    const list = payload?.results ?? [];
    if (sort === "Nearby") {
      return [...list].sort((a, b) => (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) - (b.distanceMeters ?? Number.MAX_SAFE_INTEGER));
    }
    return list;
  }, [payload?.results, sort]);

  function dropChip(phrase: string) {
    const next = query.replace(new RegExp(phrase, "ig"), " ").replace(/\s+/g, " ").trim();
    setQuery(next);
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: citySpace.page, gap: 12 }}>
        <View style={styles.top}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
            <Ionicons name="chevron-back" size={24} color={city.ink} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Edit search" onPress={() => router.push("/search")} style={styles.query}>
            <CityText numberOfLines={1}>{query || "Search"}</CityText>
          </Pressable>
        </View>
        {payload?.locationLabel ? (
          <CityText size="meta" tone="muted">
            {payload.locationLabel}
          </CityText>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {chips.map((chip) => (
            <Pressable key={chip.id} accessibilityRole="button" accessibilityLabel={`Remove ${chip.label}`} onPress={() => dropChip(chip.phrase)} style={styles.filterOn}>
              <CityText size="meta" tone="onDark">
                {chip.label}
              </CityText>
            </Pressable>
          ))}
          {extras.map((extra) => {
            const on = query.toLowerCase().includes(extra);
            return (
              <Pressable key={extra} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setQuery(on ? query.replace(new RegExp(extra, "ig"), "").replace(/\s+/g, " ").trim() : `${query} ${extra}`.trim())} style={[styles.filter, on && styles.filterOn]}>
                <CityText size="meta" tone={on ? "onDark" : "ink"}>
                  {extra === "tonight" ? "Tonight" : "Open now"}
                </CityText>
              </Pressable>
            );
          })}
          {(["Recommended", "Nearby"] as const).map((item) => (
            <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: sort === item }} onPress={() => setSort(item)} style={[styles.filter, sort === item && styles.filterOn]}>
              <CityText size="meta" tone={sort === item ? "onDark" : "ink"}>
                {item}
              </CityText>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={{ padding: citySpace.page, gap: 12, paddingBottom: insets.bottom + 96 }}>
        {search.isPending ? <View style={styles.skeleton} /> : null}
        {search.isError ? <EmptyState title="Search didn't finish" body={friendlyError(search.error)} action="Try again" onAction={() => search.mutate(query)} /> : null}
        {payload?.notices.map((notice) => (
          <CityText key={notice.code} size="meta" tone="muted">
            {notice.message}
          </CityText>
        ))}
        {!search.isPending && !search.isError && results.length === 0 ? (
          <EmptyState title="Nothing matched" body="Try a wider idea, or take a filter off." action="Edit search" onAction={() => router.push("/search")} />
        ) : (
          results.map((item: SearchResult) => <SubjectResultCard key={item.id} item={item} />)
        )}
      </ScrollView>
      <GuideFab from="Results" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: city.page },
  top: { flexDirection: "row", alignItems: "center", gap: 8 },
  back: { width: 40, height: 44, justifyContent: "center" },
  query: { flex: 1, minHeight: 44, justifyContent: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: city.line },
  filters: { gap: 8 },
  filter: { borderRadius: 999, backgroundColor: city.chip, paddingHorizontal: 14, paddingVertical: 8 },
  filterOn: { borderRadius: 999, backgroundColor: city.ink, paddingHorizontal: 14, paddingVertical: 8 },
  skeleton: { height: 92, borderRadius: 16, backgroundColor: city.photo },
});
