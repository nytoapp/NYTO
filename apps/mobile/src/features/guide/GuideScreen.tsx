import { classifyGuideRequest } from "@atlas/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { leave } from "../nav/leave";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CityText, QuietButton } from "../city/chrome";
import { city, cityRadius, citySpace } from "../city/theme";
import { useDiscoveryLocation } from "../location/location-store";

const prompts = ["Suggest a 3-day itinerary", "Best places for a first date", "What's happening tonight?", "Show me hidden gems"];

export function GuideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ from?: string; ask?: string }>();
  const placeName = useDiscoveryLocation((state) => state.selected?.label) ?? "Choose a city";
  const from = typeof params.from === "string" ? params.from : "CITYDAY";
  const asked = typeof params.ask === "string" ? params.ask : "";
  const [message, setMessage] = useState("");
  const [prompt, setPrompt] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);

  function nearestBrowse(text: string): { label: string; query: string } | null {
    const lowered = text.toLowerCase();
    if (/\b(first date|date night)\b/.test(lowered)) return { label: "Browse restaurants", query: "restaurants" };
    if (/\bitinerary\b|\bhidden gems?\b|\bwhat(?:'s| is) happening\b/.test(lowered)) return { label: "Browse things to do", query: "things to do" };
    return null;
  }

  function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const guide = classifyGuideRequest(trimmed);
    if (!guide.searchQuery) {
      setPrompt(trimmed);
      setReply(guide.message);
      return;
    }
    setPrompt(null);
    setReply(null);
    router.push({ pathname: "/results", params: { q: guide.searchQuery } });
  }

  useEffect(() => {
    if (asked) ask(asked);
  }, [asked]);

  return (
    <View style={[styles.screen, { paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <StatusBar style="dark" />
      <View style={styles.grabber} />
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <CityText size="title">Ask your city guide</CityText>
          <CityText size="meta" tone="muted">
            {placeName} · {from}
          </CityText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => leave(router, "/")} style={styles.close}>
          <Ionicons name="close" size={20} color={city.ink} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <CityText>
          Tell me what kind of day you want, and I’ll shape it from places already in CITYDAY.
        </CityText>
        {prompt && reply ? (
          <View style={styles.exchange}>
            <CityText size="caption" tone="quiet">
              YOU
            </CityText>
            <CityText>{prompt}</CityText>
            <CityText size="caption" tone="quiet">
              CITYDAY
            </CityText>
            <CityText>{reply}</CityText>
            {nearestBrowse(prompt) ? (
              <QuietButton label={nearestBrowse(prompt)?.label ?? "Browse"} onPress={() => router.push({ pathname: "/results", params: { q: nearestBrowse(prompt)?.query ?? "things to do" } })} />
            ) : null}
          </View>
        ) : null}
        <View style={styles.prompts}>
          {prompts.map((prompt) => (
            <Pressable key={prompt} accessibilityRole="button" accessibilityLabel={prompt} onPress={() => ask(prompt)} style={styles.prompt}>
              <CityText size="meta">{prompt}</CityText>
            </Pressable>
          ))}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Build my evening" onPress={() => router.push("/evening")}>
          <CityText size="section">Build my evening</CityText>
        </Pressable>
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          accessibilityLabel="Message"
          value={message}
          onChangeText={setMessage}
          placeholder="Type your message"
          placeholderTextColor={city.quiet}
          style={styles.input}
          returnKeyType="send"
          onSubmitEditing={() => ask(message)}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={() => ask(message)} style={styles.send}>
          <Ionicons name="arrow-up" size={18} color={city.onDark} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: city.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  grabber: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: "#DDD6CC", marginBottom: 12 },
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: citySpace.page, gap: 12 },
  headerCopy: { flex: 1, gap: 4 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: city.chip, alignItems: "center", justifyContent: "center" },
  body: { padding: citySpace.page, gap: 18 },
  exchange: { gap: 8 },
  prompts: { gap: 10 },
  prompt: { borderRadius: cityRadius.card, backgroundColor: city.page, paddingHorizontal: 16, paddingVertical: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: city.line },
  composer: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: citySpace.page, paddingTop: 8 },
  input: { flex: 1, minHeight: 48, borderRadius: 24, backgroundColor: city.page, paddingHorizontal: 16, color: city.ink, fontSize: 16 },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: city.ink, alignItems: "center", justifyContent: "center" },
});
