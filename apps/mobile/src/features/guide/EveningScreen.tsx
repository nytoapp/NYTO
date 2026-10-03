import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CityText, DarkButton } from "../city/chrome";
import { city, citySpace } from "../city/theme";

const moods = [
  { id: "food", label: "Food", icon: "restaurant-outline" as const },
  { id: "music", label: "Music", icon: "musical-notes-outline" as const },
  { id: "drinks", label: "Drinks", icon: "wine-outline" as const },
  { id: "culture", label: "Culture", icon: "color-palette-outline" as const },
  { id: "social", label: "Social", icon: "people-outline" as const },
  { id: "surprise", label: "Surprise me", icon: "sparkles-outline" as const },
];
const whens = ["Tonight", "This weekend"];
const company = ["Myself", "Partner", "Friends", "Family"];
export function EveningScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mood, setMood] = useState("food");
  const [when, setWhen] = useState("Tonight");
  const [withWhom, setWithWhom] = useState("Myself");

  function show() {
    const chosen = moods.find((item) => item.id === mood);
    const query = [chosen?.label ?? "evening", when, withWhom === "Myself" ? "" : `with ${withWhom}`].filter(Boolean).join(" ");
    router.push({ pathname: "/results", params: { q: query } });
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 28, paddingHorizontal: citySpace.page }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={city.ink} />
        </Pressable>
        <CityText size="display">Build my evening</CityText>
        <CityText size="section" style={styles.ask}>
          What are you feeling?
        </CityText>
        <View style={styles.grid}>
          {moods.map((item) => {
            const on = mood === item.id;
            return (
              <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={item.label} onPress={() => setMood(item.id)} style={[styles.mood, on && styles.on]}>
                <Ionicons name={item.icon} size={18} color={on ? city.onDark : city.ink} />
                <CityText size="meta" tone={on ? "onDark" : "ink"}>
                  {item.label}
                </CityText>
              </Pressable>
            );
          })}
        </View>
        <CityText size="section" style={styles.ask}>
          When?
        </CityText>
        <View style={styles.row}>
          {whens.map((item) => (
            <Choice key={item} label={item} on={when === item} onPress={() => setWhen(item)} />
          ))}
        </View>
        <CityText size="section" style={styles.ask}>
          With?
        </CityText>
        <View style={styles.row}>
          {company.map((item) => (
            <Choice key={item} label={item} on={withWhom === item} onPress={() => setWithWhom(item)} />
          ))}
        </View>
        <View style={styles.cta}>
          <DarkButton label="Show me" onPress={show} />
        </View>
      </ScrollView>
    </View>
  );
}

function Choice({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={label} onPress={onPress} style={[styles.choice, on && styles.on]}>
      <CityText size="meta" tone={on ? "onDark" : "ink"}>
        {label}
      </CityText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: city.page },
  back: { width: 44, height: 44, justifyContent: "center" },
  ask: { marginTop: 28, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  mood: { width: "47%", minHeight: 64, borderRadius: 16, backgroundColor: city.paper, borderWidth: StyleSheet.hairlineWidth, borderColor: city.line, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { borderRadius: 999, backgroundColor: city.chip, paddingHorizontal: 16, paddingVertical: 10 },
  on: { backgroundColor: city.ink, borderColor: city.ink },
  cta: { marginTop: 32 },
});
