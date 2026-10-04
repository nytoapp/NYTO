import { useQuery, useQueries } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CityText, EmptyState } from "../city/chrome";
import { SubjectResultCard } from "../city/cards";
import { ListSkeleton } from "../city/skeleton";
import { city, citySpace } from "../city/theme";
import { useSession } from "../auth/useSession";
import { useDiscoveryLocation } from "../location/location-store";
import { loadSubject } from "../subject/load-subject";
import { loadSaves, readSaveList } from "./save-list";

const tabs = ["Places", "Events", "Activities", "Plans"] as const;

export function SavedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signedIn, restoring } = useSession();
  const selected = useDiscoveryLocation((state) => state.selected);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Places");
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
    if (tab === "Events") return subject.kind === "event" || subject.kind === "media";
    if (tab === "Activities") return subject.kind === "activity" || subject.kind === "experience";
    if (tab === "Plans") return false;
    return subject.kind === "place" || subject.kind === "accommodation";
  });
  const exploreLabel = selected ? `Explore ${selected.label}` : "Choose a city";
  const openExplore = () => router.push(selected ? "/explore" : "/city");
  const loading = restoring || (signedIn && (saves.isLoading || (!saves.isSuccess && !saves.isError) || detailsPending));
  const placesMissing = signedIn && saves.isSuccess && savedItems.length > 0 && subjects.length === 0 && !detailsPending;
  const failed = signedIn && (saves.isError || placesMissing);
  const empty = signedIn && saves.isSuccess && savedItems.length === 0 && tab !== "Plans" && !loading && !failed;
  const plansTab = signedIn && tab === "Plans" && !loading && !failed;
  const filteredEmpty = signedIn && tab !== "Plans" && saves.isSuccess && savedItems.length > 0 && !loading && !failed && visible.length === 0;

  function retry() {
    void saves.refetch();
    for (const query of detailList) void query.refetch();
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32, gap: 12 }} showsVerticalScrollIndicator={false}>
        <View style={styles.pad}>
          <CityText size="display">Saved</CityText>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {tabs.map((item) => {
            const on = tab === item;
            return (
              <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setTab(item)} style={[styles.tab, on && styles.tabOn]}>
                <CityText size="meta" tone={on ? "onDark" : "ink"}>
                  {item}
                </CityText>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.list}>
          {!restoring && !signedIn ? <EmptyState title="Your saves live here" body="Sign in to keep places you want to come back to." action="Sign in" onAction={() => router.push("/sign-in")} /> : null}
          {loading ? <ListSkeleton /> : null}
          {failed && !loading ? (
            <EmptyState title="Couldn't load your saves" body="We couldn't retrieve your saved places right now." action="Try again" onAction={retry} />
          ) : null}
          {plansTab ? <EmptyState title="Plans live with your trips" body="Open Plans to see evenings you have saved." action="Plans" onAction={() => router.push("/(tabs)/trips")} /> : null}
          {empty ? <EmptyState title="Nothing saved yet" body="Save places and experiences you want to come back to." action={exploreLabel} onAction={openExplore} /> : null}
          {filteredEmpty ? <CityText tone="muted">Nothing in this list yet.</CityText> : null}
          {!loading && !failed && tab !== "Plans"
            ? visible.map((subject) => (
                <SubjectResultCard
                  key={subject.id}
                  item={{
                    ...subject,
                    factSource: "catalog",
                    provider: null,
                    state: "ok",
                    distanceMeters: null,
                    destination: subject.booking?.destinationId && subject.booking.label ? { id: subject.booking.destinationId, label: subject.booking.label } : null,
                    reasons: [],
                  }}
                />
              ))
            : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: city.page },
  pad: { paddingHorizontal: citySpace.page },
  tabs: { paddingHorizontal: citySpace.page, gap: 8 },
  tab: { borderRadius: 999, backgroundColor: city.chip, paddingHorizontal: 14, paddingVertical: 8 },
  tabOn: { backgroundColor: city.ink },
  list: { paddingHorizontal: citySpace.page, gap: 12 },
});
