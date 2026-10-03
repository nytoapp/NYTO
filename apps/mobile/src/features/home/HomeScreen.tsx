import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CityText, EmptyState, GuideFab, SectionTitle } from "../city/chrome";
import { SubjectRailCard } from "../city/cards";
import { localHour, localWeekday } from "../city/format";
import { city, citySpace } from "../city/theme";
import { destinations } from "../discovery/browse";
import { friendlyError } from "../../lib/errors";
import { useDiscoveryLocation } from "../location/location-store";
import { useHome } from "./useHome";

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const selected = useDiscoveryLocation((state) => state.selected);
  const setSelected = useDiscoveryLocation((state) => state.setSelected);
  const home = useHome();
  const zone = home.data?.timezone ?? selected?.timezone ?? null;
  const hour = localHour(zone);
  const place = home.data?.locationLabel ?? selected?.label ?? "your city";

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 120 }}>
        <View style={styles.mast}>
          <View style={styles.brandRow}>
            <CityText size="caption" tone="quiet">
              CITYDAY
            </CityText>
            <Pressable accessibilityRole="button" accessibilityLabel="Profile" onPress={() => router.push("/profile")} style={styles.bell}>
              <Ionicons name="person-outline" size={20} color={city.ink} />
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cities}>
            {destinations.map((destination) => {
              const on = destination.location ? selected?.id === destination.location.id : selected === null;
              return (
                <Pressable
                  key={destination.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`Browse ${destination.label}`}
                  onPress={() => setSelected(destination.location)}
                  style={[styles.cityChip, on && styles.cityChipOn]}
                >
                  <CityText size="meta" tone={on ? "onDark" : "ink"}>
                    {destination.label}
                  </CityText>
                </Pressable>
              );
            })}
          </ScrollView>
          <CityText size="display" style={styles.hello}>
            {greeting(hour)}
          </CityText>
          <CityText tone="muted">
            {place} · {localWeekday(zone)}
          </CityText>
        </View>

        <Pressable accessibilityRole="search" accessibilityLabel="Search the city" onPress={() => router.push("/search")} style={styles.search}>
          <Ionicons name="search-outline" size={18} color={city.quiet} />
          <CityText tone="quiet">What do you want to do?</CityText>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel="Build my evening" onPress={() => router.push("/evening")} style={styles.plan}>
          <CityText size="section">Build my evening</CityText>
          <CityText size="meta" tone="muted">
            A search for the kind of night you want.
          </CityText>
        </Pressable>

        {home.isLoading ? (
          <View style={styles.pad}>
            <View style={styles.skeleton} />
            <View style={styles.skeletonShort} />
          </View>
        ) : null}

        {home.isError ? (
          <EmptyState title="The city guide didn't load" body={friendlyError(home.error, "The catalog could not be reached. Try again.")} action="Try again" onAction={() => void home.refetch()} />
        ) : null}

        {home.data && home.data.explore.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shortcuts}>
            {home.data.explore.map((item) => (
              <Pressable key={item.slug} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => router.push({ pathname: "/results", params: { q: item.label } })} style={styles.shortcut}>
                <CityText size="meta">{item.label}</CityText>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {home.data?.rails.map((rail) => (
          <View key={rail.key} style={styles.railBlock}>
            <SectionTitle title={rail.title} />
            {rail.items.length === 0 ? (
              <View style={styles.pad}>
                <CityText tone="muted">Nothing is published on this rail yet.</CityText>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
                {rail.items.map((item) => (
                  <SubjectRailCard key={item.id} item={item} />
                ))}
              </ScrollView>
            )}
          </View>
        ))}

        {home.data && home.data.rails.every((rail) => rail.items.length === 0) ? (
          <EmptyState title="This city is still quiet" body="The catalog has no places for this location yet. Search still uses the same guide." action="Search" onAction={() => router.push("/search")} />
        ) : null}

        <Pressable accessibilityRole="button" accessibilityLabel="Open the map" onPress={() => router.push({ pathname: "/map", params: { q: "things to do" } })} style={styles.mapLink}>
          <Ionicons name="map-outline" size={18} color={city.ink} />
          <CityText size="section">Map</CityText>
        </Pressable>
      </ScrollView>
      <GuideFab from="Home" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: city.page },
  mast: { paddingHorizontal: citySpace.page },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bell: { width: 44, height: 44, alignItems: "flex-end", justifyContent: "center" },
  cities: { gap: 8, paddingVertical: 8 },
  cityChip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: city.chip },
  cityChipOn: { backgroundColor: city.ink },
  hello: { marginTop: 18 },
  search: {
    marginTop: 18,
    marginHorizontal: citySpace.page,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: city.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: city.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  plan: { marginTop: 14, marginHorizontal: citySpace.page, gap: 4 },
  shortcuts: { paddingHorizontal: citySpace.page, gap: 8, paddingVertical: 18 },
  shortcut: { borderRadius: 999, backgroundColor: city.chip, paddingHorizontal: 14, paddingVertical: 8 },
  railBlock: { marginBottom: 22 },
  rail: { paddingHorizontal: citySpace.page, gap: 14 },
  pad: { paddingHorizontal: citySpace.page, gap: 10 },
  skeleton: { height: 150, borderRadius: 16, backgroundColor: city.photo, marginTop: 20 },
  skeletonShort: { height: 18, width: "46%", borderRadius: 8, backgroundColor: city.photo },
  mapLink: { marginTop: 8, marginHorizontal: citySpace.page, minHeight: 52, flexDirection: "row", alignItems: "center", gap: 10 },
});
