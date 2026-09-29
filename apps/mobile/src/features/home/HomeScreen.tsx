import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import type { SearchResult } from "@atlas/contracts";
import { FeaturedPlaceCard, MoodRail, PlaceCard, Rail, SectionHeader } from "../../components/discovery";
import { AppText, Screen, SearchField, Skeleton } from "../../components/ui";
import { useTheme } from "../../components/theme/ThemeProvider";
import { space } from "../../components/theme/tokens";
import { destinations, isCatalogId } from "../discovery/browse";
import { useDiscoveryLocation } from "../location/location-store";
import { interestsById } from "../onboarding/interests";
import { useOnboarding } from "../onboarding/store";
import { useSearchHandoff } from "../search/handoff";
import { useHome } from "./useHome";

const moods = [
  { id: "eat", label: "Eat", query: "restaurants", icon: "restaurant-outline" },
  { id: "drink", label: "Drink", query: "bars", icon: "wine-outline" },
  { id: "do", label: "Do", query: "things to do", icon: "walk-outline" },
  { id: "events", label: "Events", query: "events", icon: "ticket-outline" },
  { id: "stay", label: "Stay", query: "hotels", icon: "bed-outline" },
] as const;

function forYouLine(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "This morning, for you";
  if (hour < 17) return "This afternoon, for you";
  return "Tonight, for you";
}

export function HomeScreen() {
  const colors = useTheme();
  const router = useRouter();
  const home = useHome();
  const selected = useDiscoveryLocation((state) => state.selected);
  const setSelected = useDiscoveryLocation((state) => state.setSelected);
  const ask = useSearchHandoff((state) => state.ask);
  const chosen = interestsById(useOnboarding((state) => state.interests));
  const [draft, setDraft] = useState("");
  const rail = home.data?.rails.find((item) => item.items.length > 0);
  const featured = rail?.items[0];
  const rest = rail?.items.slice(1) ?? [];
  const city = selected?.label ?? home.data?.locationLabel ?? "Nearby";

  function openSearch(next: string) {
    const trimmed = next.trim();
    if (!trimmed) {
      router.push("/search");
      return;
    }
    ask(trimmed);
    router.push("/search");
  }

  function openItem(item: SearchResult) {
    if (isCatalogId(item.id)) {
      router.push(`/subject/${item.id}`);
    }
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.mast}>
          <AppText role="brand" tone="tertiary">
            CITYDAY
          </AppText>
          <AppText role="title">{city}</AppText>
          <View style={styles.cities}>
            {destinations.map((destination) => {
              const on = destination.location ? selected?.id === destination.location.id : selected === null;
              return (
                <Pressable key={destination.label} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setSelected(destination.location)}>
                  <AppText role="label" tone={on ? "ink" : "tertiary"}>
                    {destination.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.intro}>
          <AppText role="headlineMedium">{forYouLine()}</AppText>
          <AppText tone="muted">A few places worth deciding on.</AppText>
        </View>

        <SearchField value={draft} onChangeText={setDraft} placeholder="Search the city" onSubmit={() => openSearch(draft)} />

        {home.isLoading ? <Skeleton height={280} /> : null}

        {home.isError ? (
          <View style={styles.notice}>
            <View style={[styles.rule, { backgroundColor: colors.accent }]} />
            <AppText role="headline">Nothing good came through yet.</AppText>
            <AppText tone="muted">Try another area, or search the city directly.</AppText>
            <Pressable accessibilityRole="button" accessibilityLabel="Try again" onPress={() => void home.refetch()} style={styles.retry}>
              <AppText role="label" tone="accent">
                Try again
              </AppText>
            </Pressable>
          </View>
        ) : null}

        {featured ? <FeaturedPlaceCard item={featured} reason={rail?.title ?? city} onPress={() => openItem(featured)} /> : null}

        {home.data && !home.isLoading && !home.isError && !featured ? (
          <View style={styles.notice}>
            <View style={[styles.rule, { backgroundColor: colors.accent }]} />
            <AppText role="headline">Your next place starts here.</AppText>
            <AppText tone="muted">Explore the city and save what catches your eye.</AppText>
            <Pressable accessibilityRole="button" accessibilityLabel="Explore places" onPress={() => router.push("/search")} style={styles.retry}>
              <AppText role="label" tone="accent">
                Explore places
              </AppText>
            </Pressable>
          </View>
        ) : null}

        <View>
          <SectionHeader title="Explore" />
          <MoodRail items={moods.map((item) => ({ id: item.id, label: item.label, icon: item.icon }))} onPress={(id) => {
            const mood = moods.find((item) => item.id === id);
            if (mood) openSearch(mood.query);
          }} />
        </View>

        {rest.length > 0 ? (
          <View>
            <SectionHeader title="Also nearby" />
            <Rail>
              {rest.map((item) => (
                <PlaceCard key={item.id} item={item} onPress={() => openItem(item)} />
              ))}
            </Rail>
          </View>
        ) : null}

        {chosen.length > 0 ? (
          <View style={styles.stack}>
            <SectionHeader title="From your interests" />
            {chosen.map((item) => (
              <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => openSearch(item.query)} style={[styles.interest, { borderColor: colors.divider }]}>
                <AppText role="bodyLarge">{item.label}</AppText>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Pressable accessibilityRole="button" accessibilityLabel="Build your evening" onPress={() => router.push("/trips")} style={[styles.plan, { borderTopColor: colors.divider }]}>
          <AppText role="brand" tone="tertiary">
            BUILD YOUR EVENING
          </AppText>
          {["Dinner", "Drinks", "Event"].map((item, index) => (
            <View key={item} style={styles.step}>
              <AppText role="caption" tone="tertiary">
                {String(index + 1).padStart(2, "0")}
              </AppText>
              <AppText role="headline">{item}</AppText>
            </View>
          ))}
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: space[5], paddingBottom: space[8] },
  mast: { gap: 4, paddingTop: space[2] },
  cities: { flexDirection: "row", gap: space[4], marginTop: space[2] },
  intro: { gap: space[2] },
  stack: { gap: space[2] },
  notice: { gap: space[2], paddingVertical: space[2] },
  rule: { width: 28, height: 2, borderRadius: 1 },
  retry: { minHeight: 44, justifyContent: "center" },
  interest: { borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 52, justifyContent: "center" },
  plan: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space[5], gap: space[3] },
  step: { flexDirection: "row", alignItems: "baseline", gap: space[3] },
});
