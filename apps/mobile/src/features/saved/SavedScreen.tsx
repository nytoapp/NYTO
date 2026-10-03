import type { SubjectDetail } from "@atlas/contracts";
import { useQuery, useQueries } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest } from "../../api/client";
import { CityText, EmptyState } from "../city/chrome";
import { SubjectResultCard } from "../city/cards";
import { city, citySpace } from "../city/theme";
import { useSession } from "../auth/useSession";

const tabs = ["Places", "Events", "Activities", "Plans"] as const;

export function SavedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signedIn } = useSession();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Places");
  const saves = useQuery({
    queryKey: ["saves"],
    enabled: signedIn,
    queryFn: async () => {
      const response = await apiRequest<{ items: { id: string; subjectId: string }[] }>("/api/v1/saves");
      if (response.error || !response.data) {
        throw new Error(response.error?.message ?? "Saves could not be loaded.");
      }
      return response.data.items;
    },
  });
  const details = useQueries({
    queries: (saves.data ?? []).map((item) => ({
      queryKey: ["subject", item.subjectId],
      queryFn: async () => {
        const response = await apiRequest<SubjectDetail>(`/api/v1/subjects/${item.subjectId}`);
        if (response.error || !response.data) return null;
        return response.data;
      },
    })),
  });
  const subjects = details.flatMap((query) => (query.data ? [query.data] : []));
  const visible = subjects.filter((subject) => {
    if (tab === "Events") return subject.kind === "event" || subject.kind === "media";
    if (tab === "Activities") return subject.kind === "activity" || subject.kind === "experience";
    if (tab === "Plans") return false;
    return subject.kind === "place" || subject.kind === "accommodation";
  });

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
          {!signedIn ? <EmptyState title="Sign in to keep saves" body="Places you save stay with your account." action="Log in" onAction={() => router.push("/sign-in")} /> : null}
          {signedIn && saves.isError ? <EmptyState title="Saves didn't load" body="Give it another try." action="Try again" onAction={() => void saves.refetch()} /> : null}
          {signedIn && tab === "Plans" ? <EmptyState title="Plans live with your trips" body="Open Plans to see evenings you have saved." action="Plans" onAction={() => router.push("/(tabs)/trips")} /> : null}
          {signedIn && tab !== "Plans" && !saves.isLoading && visible.length === 0 ? <EmptyState title="Nothing saved yet" body="Save places and experiences you want to come back to." action="Explore" onAction={() => router.push("/explore")} /> : null}
          {tab !== "Plans"
            ? visible.map((subject) => (
                <SubjectResultCard
                  key={subject.id}
                  item={{
                    ...subject,
                    factSource: "catalog",
                    provider: null,
                    state: "ok",
                    distanceMeters: null,
                    destination: subject.booking.destinationId && subject.booking.label ? { id: subject.booking.destinationId, label: subject.booking.label } : null,
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
