import type { SearchResult } from "@atlas/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CityText, DarkButton, EmptyState, Photo } from "../city/chrome";
import { isCatalogId, subjectMeta } from "../city/format";
import { city, cityRadius, citySpace } from "../city/theme";
import { useSearch } from "../search/useSearch";
import { useState } from "react";

export function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string }>();
  const query = typeof params.q === "string" && params.q.trim() ? params.q : "things to do";
  const search = useSearch();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    search.mutate(query);
  }, [query, search.mutate]);

  const located = useMemo(() => (search.data?.data?.results ?? []).filter((item) => item.location), [search.data]);
  const selected = located.find((item) => item.id === selectedId) ?? located[0];
  const frame = useMemo(() => bounds(located), [located]);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={[styles.canvas, { marginTop: insets.top }]}>
        {located.map((item) => (
          <Pin key={item.id} item={item} frame={frame} selected={item.id === selected?.id} onPress={() => setSelectedId(item.id)} />
        ))}
        <View style={styles.searchPill}>
          <CityText size="meta">{search.data?.data?.locationLabel ?? query}</CityText>
        </View>
        {search.isError || (!search.isPending && located.length === 0) ? (
          <View style={styles.empty}>
            <EmptyState title="No mapped places" body="This search has no coordinates to pin." action="Back" onAction={() => router.back()} />
          </View>
        ) : null}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={[styles.back, { top: insets.top + 12 }]}>
        <Ionicons name="chevron-back" size={22} color={city.ink} />
      </Pressable>
      {selected ? (
        <View style={[styles.card, { bottom: Math.max(insets.bottom, 16) }]}>
          <Photo uri={selected.images[0]?.url ?? ""} style={styles.thumb} />
          <View style={styles.copy}>
            <CityText size="section" numberOfLines={2}>
              {selected.title}
            </CityText>
            <CityText size="meta" tone="muted" numberOfLines={2}>
              {subjectMeta(selected)}
            </CityText>
            {isCatalogId(selected.id) ? <DarkButton label="View" onPress={() => router.push(`/subject/${selected.id}`)} /> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function bounds(items: SearchResult[]) {
  const points = items.flatMap((item) => (item.location ? [item.location] : []));
  if (points.length === 0) return null;
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  return {
    minLat: Math.min(...latitudes),
    maxLat: Math.max(...latitudes),
    minLng: Math.min(...longitudes),
    maxLng: Math.max(...longitudes),
  };
}

function Pin({ item, frame, selected, onPress }: { item: SearchResult; frame: ReturnType<typeof bounds>; selected: boolean; onPress: () => void }) {
  if (!item.location || !frame) return null;
  const latSpan = frame.maxLat - frame.minLat || 0.01;
  const lngSpan = frame.maxLng - frame.minLng || 0.01;
  const left = 12 + ((item.location.longitude - frame.minLng) / lngSpan) * 70;
  const top = 16 + ((frame.maxLat - item.location.latitude) / latSpan) * 55;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={onPress} style={[styles.pin, { left: `${left}%`, top: `${top}%` }]}>
      <Ionicons name="location" size={selected ? 28 : 22} color={selected ? city.ink : "#5C564E"} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#E7E1D6" },
  canvas: { flex: 1 },
  searchPill: { position: "absolute", top: 64, alignSelf: "center", backgroundColor: city.paper, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  empty: { flex: 1, justifyContent: "center" },
  back: { position: "absolute", left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: city.paper, alignItems: "center", justifyContent: "center" },
  pin: { position: "absolute" },
  card: { position: "absolute", left: citySpace.page, right: citySpace.page, flexDirection: "row", gap: 12, backgroundColor: city.paper, borderRadius: cityRadius.card, padding: 12 },
  thumb: { width: 84, height: 108, borderRadius: 12 },
  copy: { flex: 1, gap: 6, justifyContent: "center" },
});
