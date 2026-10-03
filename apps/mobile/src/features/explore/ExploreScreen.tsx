import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CityText, GuideFab } from "../city/chrome";
import { city, citySpace } from "../city/theme";
import { useHome } from "../home/useHome";

const ideas = [
  { label: "Things to do this weekend", query: "things to do this weekend" },
  { label: "A first date", query: "date night" },
  { label: "Something outdoors", query: "outdoors" },
  { label: "Live music", query: "live music" },
  { label: "Museums", query: "museum" },
  { label: "Nightlife", query: "nightlife" },
];

export function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const home = useHome();
  const categories = home.data?.explore ?? [];

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.pad}>
          <CityText size="display">Explore</CityText>
          <CityText tone="muted">A guide to the city you are browsing. Every result comes from search.</CityText>
          <Pressable accessibilityRole="search" accessibilityLabel="Search" onPress={() => router.push("/search")} style={styles.search}>
            <CityText tone="quiet">Search the city</CityText>
          </Pressable>
        </View>
        <View style={styles.block}>
          <CityText size="section">Collections</CityText>
          {ideas.map((item) => (
            <Pressable key={item.query} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => router.push({ pathname: "/results", params: { q: item.query } })} style={styles.row}>
              <CityText>{item.label}</CityText>
            </Pressable>
          ))}
        </View>
        {categories.length > 0 ? (
          <View style={styles.block}>
            <CityText size="section">From the catalog</CityText>
            <View style={styles.grid}>
              {categories.map((item) => (
                <Pressable key={item.slug} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => router.push({ pathname: "/results", params: { q: item.label } })} style={styles.cell}>
                  <CityText size="section">{item.label}</CityText>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Search a neighborhood" onPress={() => router.push("/search")} style={styles.rowPad}>
          <CityText size="section">Neighborhoods</CityText>
          <CityText size="meta" tone="muted">
            Search a neighborhood name. CITYDAY uses the same guide.
          </CityText>
        </Pressable>
      </ScrollView>
      <GuideFab from="Explore" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: city.page },
  pad: { paddingHorizontal: citySpace.page, gap: 12 },
  search: { minHeight: 52, borderRadius: 16, backgroundColor: city.paper, borderWidth: StyleSheet.hairlineWidth, borderColor: city.line, justifyContent: "center", paddingHorizontal: 16 },
  block: { paddingHorizontal: citySpace.page, paddingTop: 28, gap: 8 },
  row: { minHeight: 48, justifyContent: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: city.line },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  cell: { flexGrow: 1, flexBasis: "46%", minHeight: 72, borderRadius: 16, backgroundColor: city.paper, borderWidth: StyleSheet.hairlineWidth, borderColor: city.line, justifyContent: "center", paddingHorizontal: 14 },
  rowPad: { marginTop: 28, paddingHorizontal: citySpace.page, gap: 4 },
});
