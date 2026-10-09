import type { SearchResult } from "@atlas/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { leave } from "../nav/leave";
import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CityText, DarkButton, EmptyState } from "../city/chrome";
import { CityImage } from "../city/image";
import { CategoryCover } from "../city/place-card";
import { isCatalogId, subjectMeta } from "../city/format";
import { city, cityRadius, citySpace } from "../city/theme";
import { useSearch } from "../search/useSearch";
import { fitMap, pinOffset, TileMap } from "./tile-map";
import { useState } from "react";

export function MapScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams<{ q?: string }>();
  const query = typeof params.q === "string" && params.q.trim() ? params.q : "things to do";
  const search = useSearch();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    search.mutate(query);
  }, [query, search.mutate]);

  const located = useMemo(() => (Array.isArray(search.data?.data?.results) ? search.data.data.results : []).filter((item) => item.location), [search.data]);
  const selected = located.find((item) => item.id === selectedId) ?? located[0];
  const mapHeight = Math.max(height - insets.top, 320);
  const frame = useMemo(
    () => (located.length > 0 ? fitMap(located.flatMap((item) => (item.location ? [item.location] : [])), width, mapHeight) : null),
    [located, mapHeight, width],
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={[styles.canvas, { marginTop: insets.top }]}>
        {frame ? <TileMap frame={frame} /> : null}
        {frame
          ? located.map((item) => (
              <Pin key={item.id} item={item} frame={frame} selected={item.id === selected?.id} onPress={() => setSelectedId(item.id)} />
            ))
          : null}
        <View style={styles.searchPill}>
          <CityText size="meta">{search.data?.data?.locationLabel || t("home.chooseCity")}</CityText>
          <CityText size="caption" tone="quiet">
            © OpenStreetMap © CARTO
          </CityText>
        </View>
        {search.isError ? (
          <View style={styles.empty}>
            <EmptyState title={t("map.failed")} body={t("map.failedBody")} action={t("common.tryAgain")} onAction={() => search.mutate(query)} />
          </View>
        ) : null}
        {search.isSuccess && located.length === 0 ? (
          <View style={styles.empty}>
            <EmptyState title={t("map.none")} body={t("map.noneBody")} action={t("common.back")} onAction={() => leave(router, "/")} />
          </View>
        ) : null}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={t("common.back")} onPress={() => leave(router, "/")} style={[styles.back, { top: insets.top + 12 }]}>
        <Ionicons name="chevron-back" size={22} color={city.ink} />
      </Pressable>
      {selected ? (
        <View style={[styles.card, { bottom: Math.max(insets.bottom, 16) }]}>
          {selected.images?.[0]?.url ? (
            <CityImage uri={selected.images[0].url} alt={selected.title} radius={12} style={styles.thumb} />
          ) : (
            <CategoryCover label={selected.category} style={styles.thumb} />
          )}
          <View style={styles.copy}>
            <CityText size="section" numberOfLines={2}>
              {selected.title}
            </CityText>
            <CityText size="meta" tone="muted" numberOfLines={2}>
              {subjectMeta(selected, t)}
            </CityText>
            {isCatalogId(selected.id) ? <DarkButton label={t("common.view")} onPress={() => router.push(`/subject/${selected.id}`)} /> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Pin({ item, frame, selected, onPress }: { item: SearchResult; frame: NonNullable<ReturnType<typeof fitMap>>; selected: boolean; onPress: () => void }) {
  if (!item.location) return null;
  const point = pinOffset(item.location, frame);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.pin, selected && styles.pinOn, { left: point.left - 16, top: point.top - 32 }]}
    >
      <Ionicons name="location" size={selected ? 22 : 16} color={selected ? city.onDark : city.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#d5d0c8" },
  canvas: { flex: 1, overflow: "hidden" },
  searchPill: { position: "absolute", top: 64, alignSelf: "center", backgroundColor: city.paper, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, gap: 2, maxWidth: "80%" },
  empty: { flex: 1, justifyContent: "center" },
  back: { position: "absolute", left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: city.paper, alignItems: "center", justifyContent: "center" },
  pin: { position: "absolute", width: 32, height: 32, borderRadius: 16, backgroundColor: city.paper, alignItems: "center", justifyContent: "center" },
  pinOn: { backgroundColor: city.ink },
  card: { position: "absolute", left: citySpace.page, right: citySpace.page, flexDirection: "row", gap: 12, backgroundColor: city.paper, borderRadius: cityRadius.card, padding: 12 },
  thumb: { width: 72, height: 72, minHeight: 72, borderRadius: 12 },
  copy: { flex: 1, gap: 6, justifyContent: "center" },
});
