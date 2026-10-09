import type { SubjectDetail } from "@atlas/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueries } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CityText, DarkButton, EmptyState } from "../city/chrome";
import { kindLabel } from "../city/format";
import { catalogName, kindName, placeCount } from "../i18n/labels";
import { CityImage } from "../city/image";
import { CategoryCover } from "../city/place-card";
import { ListSkeleton } from "../city/skeleton";
import { city, cityRadius, citySpace } from "../city/theme";
import { useSession } from "../auth/useSession";
import { useDiscoveryLocation } from "../location/location-store";
import { loadSubject } from "../subject/load-subject";
import { loadSaves, readSaveList } from "./save-list";

const tabIds = ["all", "places", "events", "activities"] as const;
type SavedTab = (typeof tabIds)[number];

export function SavedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signedIn, restoring } = useSession();
  const selected = useDiscoveryLocation((state) => state.selected);
  const [tab, setTab] = useState<SavedTab>("all");
  const tabs = [
    { id: "all" as const, label: t("saved.all") },
    { id: "places" as const, label: t("saved.places") },
    { id: "events" as const, label: t("saved.events") },
    { id: "activities" as const, label: t("saved.activities") },
  ];
  const saves = useQuery({
    queryKey: ["saves"],
    enabled: signedIn,
    queryFn: loadSaves,
  });
  const savedItems = readSaveList(saves.data);
  const details = useQueries({
    queries: savedItems.map((item) => ({
      queryKey: ["subject", item.subjectId],
      queryFn: () => loadSubject(item.subjectId),
    })),
  });
  const detailList = Array.isArray(details) ? details : [];
  const detailsPending = savedItems.length > 0 && detailList.some((query) => query.isPending || query.isLoading);
  const subjects = detailList.flatMap((query) => (query.data ? [query.data] : []));
  const visible = subjects.filter((subject) => {
    if (tab === "all") return true;
    if (tab === "events") return subject.kind === "event" || subject.kind === "media";
    if (tab === "activities") return subject.kind === "activity" || subject.kind === "experience";
    return subject.kind === "place" || subject.kind === "accommodation";
  });
  const exploreLabel = selected ? t("saved.find", { city: selected.label }) : t("saved.choose");
  const openExplore = () => router.push(selected ? { pathname: "/results", params: { q: "things to do" } } : "/city");
  const loading = restoring || (signedIn && (saves.isLoading || (!saves.isSuccess && !saves.isError) || detailsPending));
  const placesMissing = signedIn && saves.isSuccess && savedItems.length > 0 && subjects.length === 0 && !detailsPending;
  const failed = signedIn && (saves.isError || placesMissing);
  const empty = signedIn && saves.isSuccess && savedItems.length === 0 && !loading && !failed;
  const filteredEmpty = signedIn && saves.isSuccess && savedItems.length > 0 && !loading && !failed && visible.length === 0;
  const countLabel = placeCount(visible.length, t);
  const tabLabel = tabs.find((item) => item.id === tab)?.label ?? tab;

  function retry() {
    void saves.refetch();
    for (const query of detailList) void query.refetch();
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.pad}>
          <CityText size="display">{t("saved.title")}</CityText>
          <CityText tone="muted">{t("saved.subtitle")}</CityText>
        </View>
        <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {tabs.map((item) => {
            const on = tab === item.id;
            return (
              <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setTab(item.id)} style={[styles.tab, on && styles.tabOn]}>
                <CityText size="meta" tone={on ? "onDark" : "ink"}>
                  {item.label}
                </CityText>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.list}>
          {!restoring && !signedIn ? <EmptyState title={t("saved.guestTitle")} body={t("saved.guestBody")} action={t("signIn.login")} onAction={() => router.push({ pathname: "/sign-in", params: { mode: "login" } })} /> : null}
          {loading ? <ListSkeleton /> : null}
          {failed && !loading ? (
            <EmptyState title={t("saved.loadFailed")} body={t("saved.loadFailedBody")} action={t("common.tryAgain")} onAction={retry} />
          ) : null}
          {empty ? <SavedEmpty label={exploreLabel} onPress={openExplore} /> : null}
          {filteredEmpty ? (
            <View style={styles.filtered}>
              <CityText size="section">{t("saved.emptyFilter", { tab: tabLabel })}</CityText>
              <CityText tone="muted">{t("saved.emptyFilterBody")}</CityText>
            </View>
          ) : null}
          {!loading && !failed && visible.length > 0 ? (
            <View style={styles.listHead}>
              <CityText size="meta" tone="quiet">
                {countLabel}
              </CityText>
              <Pressable accessibilityRole="button" accessibilityLabel={t("saved.add")} onPress={openExplore} hitSlop={8}>
                <CityText size="meta">{t("saved.add")}</CityText>
              </Pressable>
            </View>
          ) : null}
          {!loading && !failed
            ? visible.map((subject) => <SavedRow key={subject.id} subject={subject} onPress={() => router.push(`/subject/${subject.id}`)} />)
            : null}
          {!loading && !failed && !empty && signedIn ? (
            <Pressable accessibilityRole="button" accessibilityLabel={t("saved.add")} onPress={openExplore} style={styles.add}>
              <Ionicons name="add" size={18} color={city.ink} />
              <CityText size="meta">{t("saved.add")}</CityText>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function SavedEmpty({ label, onPress }: { label: string; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.empty}>
      <View style={styles.emptyMark}>
        <Ionicons name="bookmark-outline" size={22} color={city.ink} />
      </View>
      <CityText size="title">{t("saved.emptyTitle")}</CityText>
      <CityText tone="muted">{t("saved.emptyBody")}</CityText>
      <DarkButton label={label} onPress={onPress} />
    </View>
  );
}

function SavedRow({ subject, onPress }: { subject: SubjectDetail; onPress: () => void }) {
  const { t } = useTranslation();
  const image = subject.images[0];
  const art = subject.category ?? kindLabel(subject.kind);
  const category = (subject.category ? catalogName(subject.category, t) : kindName(subject.kind, t)).toLocaleUpperCase();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={subject.title} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.photo}>
        {image?.url ? (
          <CityImage uri={image.url} alt={image.alt ?? subject.title} style={styles.photoImage} />
        ) : (
          <CategoryCover label={art} seed={subject.title} style={styles.photoImage} />
        )}
      </View>
      <View style={styles.copy}>
        <CityText size="caption" tone="quiet">
          {category}
        </CityText>
        <CityText size="section" numberOfLines={2}>
          {subject.title}
        </CityText>
        {subject.locality ? (
          <CityText size="meta" tone="muted" numberOfLines={1}>
            {subject.locality}
          </CityText>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={city.quiet} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: city.page },
  pad: { paddingHorizontal: citySpace.page, gap: 8 },
  tabs: { paddingHorizontal: citySpace.page, marginTop: 20, gap: 8 },
  tab: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: city.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: city.line,
    alignItems: "center",
    justifyContent: "center",
  },
  tabOn: { backgroundColor: city.ink, borderColor: city.ink },
  list: { paddingHorizontal: citySpace.page, paddingTop: 18, gap: 12 },
  listHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  filtered: { gap: 6, paddingVertical: 12 },
  empty: {
    marginTop: 8,
    backgroundColor: city.paper,
    borderRadius: cityRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: city.line,
    padding: 20,
    gap: 12,
  },
  emptyMark: { width: 44, height: 44, borderRadius: 22, backgroundColor: city.chip, alignItems: "center", justifyContent: "center" },
  add: {
    minHeight: 56,
    borderRadius: cityRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: city.line,
    backgroundColor: city.paper,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: city.paper,
    borderRadius: cityRadius.card,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: city.line,
  },
  pressed: { opacity: 0.92 },
  photo: { width: 84, height: 84, borderRadius: 14, overflow: "hidden", backgroundColor: city.chip },
  photoImage: { width: 84, height: 84 },
  copy: { flex: 1, gap: 2 },
});
