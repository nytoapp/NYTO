import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CityText } from "../city/chrome";
import { browseCategories, popularSearches } from "../discovery/browse";
import { city, citySpace } from "../city/theme";
import { useSearchHandoff } from "./handoff";

export function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const recent = useSearchHandoff((state) => state.recent);
  const remember = useSearchHandoff((state) => state.remember);
  const [query, setQuery] = useState("");

  function go(next: string) {
    const trimmed = next.trim();
    if (!trimmed) return;
    remember(trimmed);
    router.push({ pathname: "/results", params: { q: trimmed } });
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.field}>
          <Ionicons name="search-outline" size={18} color={city.quiet} />
          <TextInput
            accessibilityLabel="Search"
            value={query}
            onChangeText={setQuery}
            placeholder="Search places, events, activities"
            placeholderTextColor={city.quiet}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => go(query)}
            style={styles.input}
          />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={() => router.back()} style={styles.cancel}>
          <CityText size="meta">Cancel</CityText>
        </Pressable>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {recent.length > 0 ? (
          <View style={styles.block}>
            <CityText size="caption" tone="quiet">
              RECENT
            </CityText>
            {recent.map((item) => (
              <Pressable key={item} accessibilityRole="button" accessibilityLabel={item} onPress={() => go(item)} style={styles.row}>
                <Ionicons name="time-outline" size={16} color={city.quiet} />
                <CityText>{item}</CityText>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={styles.block}>
          <CityText size="caption" tone="quiet">
            TRY
          </CityText>
          {popularSearches.map((item) => (
            <Pressable key={item} accessibilityRole="button" accessibilityLabel={item} onPress={() => go(item)} style={styles.row}>
              <Ionicons name="search-outline" size={16} color={city.quiet} />
              <CityText>{item}</CityText>
            </Pressable>
          ))}
        </View>
        <View style={styles.block}>
          <CityText size="caption" tone="quiet">
            CATEGORIES
          </CityText>
          <View style={styles.chips}>
            {browseCategories.map((item) => (
              <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => go(item.query)} style={styles.chip}>
                <CityText size="meta">{item.label}</CityText>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: city.page },
  bar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: citySpace.page, paddingBottom: 8 },
  field: { flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: city.paper, borderWidth: StyleSheet.hairlineWidth, borderColor: city.line, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 },
  input: { flex: 1, color: city.ink, fontSize: 16, paddingVertical: 10 },
  cancel: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  block: { paddingHorizontal: citySpace.page, paddingTop: 22, gap: 4 },
  row: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: { borderRadius: 999, backgroundColor: city.chip, paddingHorizontal: 14, paddingVertical: 8 },
});
