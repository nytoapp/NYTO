import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Image, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "../city/buttons";
import { EmptyState, GuideFab } from "../city/chrome";
import { categoryArt } from "../city/category-art";
import { isCatalogId, localHour, localWeekday } from "../city/format";
import { LargePlaceCard, placeCardFromResult } from "../city/place-card";
import { SearchBar } from "../city/search-bar";
import { CardSkeleton } from "../city/skeleton";
import { color, font, fontScaleCap, space } from "../city/theme";
import { apiRequest } from "../../api/client";
import { friendlyError } from "../../lib/errors";
import { useSession } from "../auth/useSession";
import { useDiscoveryLocation } from "../location/location-store";
import { loadSaves, readSaveList } from "../saved/save-list";
import { useHome } from "./useHome";

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(280, Math.round(width * 0.74));
  const selected = useDiscoveryLocation((state) => state.selected);
  const hydrated = useDiscoveryLocation((state) => state.hydrated);
  const { signedIn } = useSession();
  const home = useHome();
  const saves = useQuery({ queryKey: ["saves"], enabled: signedIn, queryFn: loadSaves });
  const savedIds = new Set(readSaveList(saves.data).map((item) => item.subjectId));

  async function toggleSave(subjectId: string) {
    if (!signedIn) {
      router.push({ pathname: "/sign-in", params: { mode: "login" } });
      return;
    }
    const response = savedIds.has(subjectId)
      ? await apiRequest(`/api/v1/saves/${subjectId}`, { method: "DELETE" })
      : await apiRequest("/api/v1/saves", { method: "POST", body: JSON.stringify({ subjectId }) });
    if (!response.error) void saves.refetch();
  }
  const zone = home.data?.timezone ?? selected?.timezone ?? null;
  const hour = localHour(zone);
  const place = home.data?.locationLabel ?? selected?.label ?? null;
  const rails = Array.isArray(home.data?.rails) ? home.data.rails : [];
  const explore = Array.isArray(home.data?.explore) ? home.data.explore : [];
  const hasItems = rails.some((rail) => Array.isArray(rail.items) && rail.items.length > 0);

  return (
    <View style={{ flex: 1, backgroundColor: color.background }}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + space[8], paddingBottom: insets.bottom + 150 }}>
        <View style={{ paddingHorizontal: space.page, gap: space[8] }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.caption, { color: color.mutedText, letterSpacing: 1.2 }]}>
              CITYDAY
            </Text>
            <IconButton label="Profile" icon="person-outline" onPress={() => router.push("/profile")} />
          </View>
          <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.display, { color: color.primaryText }]}>
            {greeting(hour)}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel={place ? `Discovery city ${place}` : "Choose a city"} onPress={() => router.push("/city")}>
            <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.body, { color: color.secondaryText }]}>
              {place ? `${place} · ${localWeekday(zone)}` : "Choose a city"}
            </Text>
          </Pressable>
        </View>

        <View style={{ marginTop: space[20], paddingHorizontal: space.page }}>
          <SearchBar value="" editable={false} placeholder="What do you want to do?" accessibilityLabel="Search the city" onPress={() => router.push("/search")} />
        </View>

        {!hydrated || home.isLoading ? (
          <View style={{ paddingHorizontal: space.page, marginTop: space[24] }}>
            <CardSkeleton />
          </View>
        ) : null}

        {home.isError ? (
          <EmptyState title="The city guide didn't load" body={friendlyError(home.error, "The catalog could not be reached. Try again.")} action="Try again" onAction={() => void home.refetch()} />
        ) : null}

        {explore.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.page, gap: space[12], paddingVertical: space[20] }}>
            {explore.map((item) => (
              <Pressable key={item.slug} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => router.push({ pathname: "/results", params: { q: item.label } })} style={{ width: 76, alignItems: "center", gap: space[8] }}>
                <Image source={categoryArt(item.label)} style={{ width: 64, height: 64, borderRadius: 20 }} />
                <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} numberOfLines={1} style={[font.caption, { color: color.primaryText }]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View style={{ paddingHorizontal: space.page, flexDirection: "row", gap: space[12], marginBottom: space[24] }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Build my evening" onPress={() => router.push("/evening")} style={{ flex: 1, minHeight: 48, borderRadius: 16, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, alignItems: "center", justifyContent: "center", paddingHorizontal: space[12] }}>
            <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.label, { color: color.primaryText }]}>
              Build my evening
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Map" onPress={() => router.push({ pathname: "/map", params: { q: "things to do" } })} style={{ flex: 1, minHeight: 48, borderRadius: 16, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, alignItems: "center", justifyContent: "center" }}>
            <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.label, { color: color.primaryText }]}>
              Map
            </Text>
          </Pressable>
        </View>

        {rails.map((rail) => {
          const items = Array.isArray(rail.items) ? rail.items : [];
          if (items.length === 0) return null;
          return (
            <View key={rail.key} style={{ marginBottom: space[24] }}>
              <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.h2, { color: color.primaryText, paddingHorizontal: space.page, marginBottom: space[12] }]}>
                {rail.title}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.page, gap: space[16], paddingRight: space.page }}>
                {items.map((item) => (
                  <View key={item.id} style={{ width: cardWidth }}>
                    <LargePlaceCard
                      place={placeCardFromResult(item)}
                      saved={savedIds.has(item.id)}
                      onSave={isCatalogId(item.id) ? () => void toggleSave(item.id) : undefined}
                      onPress={isCatalogId(item.id) ? () => router.push(`/subject/${item.id}`) : undefined}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          );
        })}

        {hydrated && !home.isLoading && !home.isError && !hasItems ? (
          <EmptyState
            title={place ? "Nothing to show here yet" : "Choose a city"}
            body={
              place
                ? `${place} does not have published places in CITYDAY yet. Search still uses the same guide.`
                : "Pick the city you want to explore. CITYDAY does not use your phone's location for this."
            }
            action={place ? "Search" : "Choose a city"}
            onAction={() => router.push(place ? "/search" : "/city")}
          />
        ) : null}

      </ScrollView>
      <GuideFab from="Home" />
    </View>
  );
}
