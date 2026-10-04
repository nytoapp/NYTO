import { classifyGuideRequest } from "@atlas/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GuideFab } from "../city/chrome";
import { SearchBar } from "../city/search-bar";
import { categoryArt } from "../city/category-art";
import { color, font, fontScaleCap, space } from "../city/theme";
import { browseCategories, popularSearches } from "../discovery/browse";
import { useDiscoveryLocation } from "../location/location-store";
import { useHome } from "../home/useHome";

export function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tile = Math.floor((width - space.page * 2 - space[12]) / 2);
  const home = useHome();
  const selected = useDiscoveryLocation((state) => state.selected);
  const place = home.data?.locationLabel ?? selected?.label ?? null;

  function search(query: string) {
    const guide = classifyGuideRequest(query);
    if (guide.searchQuery === null) {
      router.push({ pathname: "/guide", params: { ask: query } });
      return;
    }
    router.push({ pathname: "/results", params: { q: guide.searchQuery || query } });
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.background }}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + space[16], paddingBottom: insets.bottom + space[64] + space[64] + space[24], paddingHorizontal: space.page, gap: space[24] }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: space[8] }}>
          <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} accessibilityRole="header" style={[font.display, { color: color.primaryText }]}>
            Explore
          </Text>
          <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.body, { color: color.secondaryText }]}>
            {place ? `Ideas for ${place}.` : "Choose a city to see ideas."}
          </Text>
        </View>
        <SearchBar value="" editable={false} placeholder="Search the city" accessibilityLabel="Search" onPress={() => router.push("/search")} />

        <View style={{ gap: space[12] }}>
          <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.h2, { color: color.primaryText }]}>
            Ideas
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space[12] }}>
            {popularSearches.map((item) => (
              <PictureTile key={item} label={item} width={tile} onPress={() => search(item)} />
            ))}
          </View>
        </View>

        <View style={{ gap: space[12] }}>
          <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.h2, { color: color.primaryText }]}>
            Categories
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space[12] }}>
            {browseCategories.map((item) => (
              <PictureTile key={item.id} label={item.label} width={tile} onPress={() => search(item.query)} />
            ))}
          </View>
        </View>

        <View style={{ gap: space[8] }}>
          <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.caption, { color: color.mutedText, letterSpacing: 1.1 }]}>
            NEIGHBORHOODS
          </Text>
          <DiscoveryRow label="Search a neighborhood" onPress={() => router.push("/search")} />
        </View>
      </ScrollView>
      <GuideFab from="Explore" />
    </View>
  );
}

function PictureTile({ label, width, onPress }: { label: string; width: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ width, height: 120, borderRadius: 18, overflow: "hidden" }}>
      <Image source={categoryArt(label)} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "rgba(28,25,23,0.45)" }}>
        <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} numberOfLines={2} style={[font.label, { color: color.onAccent }]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function DiscoveryRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: space[12], borderBottomWidth: 1, borderBottomColor: color.border }}>
      <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.body, { color: color.primaryText, flex: 1 }]}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={color.mutedText} />
    </Pressable>
  );
}
