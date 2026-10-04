import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CityText, DarkButton, QuietButton } from "../city/chrome";
import { city, cityRadius, citySpace } from "../city/theme";
import { useDiscoveryLocation } from "../location/location-store";

export function JourneyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const label = useDiscoveryLocation((state) => state.selected?.label) ?? "the city you choose";

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <StatusBar style="dark" />
      <View style={styles.body}>
        <CityText size="display">New to {label}?</CityText>
        <CityText tone="muted">Start with the guide that is already published for the city you are browsing.</CityText>
        <Pressable accessibilityRole="button" accessibilityLabel="Things to do" onPress={() => router.replace({ pathname: "/results", params: { q: "things to do" } })} style={styles.option}>
          <CityText size="section">Things to do</CityText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Food" onPress={() => router.replace({ pathname: "/results", params: { q: "food" } })} style={styles.option}>
          <CityText size="section">Food</CityText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Neighborhoods" onPress={() => router.replace("/search")} style={styles.option}>
          <CityText size="section">Search a neighborhood</CityText>
        </Pressable>
        <View style={styles.flex} />
        <DarkButton label="Start my journey" onPress={() => router.replace("/explore")} />
        <QuietButton label="Maybe later" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: city.page, paddingHorizontal: citySpace.page },
  body: { flex: 1, gap: 12 },
  option: { minHeight: 56, borderRadius: cityRadius.card, backgroundColor: city.paper, borderWidth: StyleSheet.hairlineWidth, borderColor: city.line, justifyContent: "center", paddingHorizontal: 16 },
  flex: { flex: 1 },
});
