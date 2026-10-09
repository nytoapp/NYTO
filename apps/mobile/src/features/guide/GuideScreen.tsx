import { classifyGuideRequest } from "@atlas/contracts";
import { useTranslation } from "react-i18next";
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

const prompts = [
  { ask: "Suggest a 3-day itinerary", key: "guide.p1" },
  { ask: "Best places for a first date", key: "guide.p2" },
  { ask: "What's happening tonight?", key: "guide.p3" },
  { ask: "Show me hidden gems", key: "guide.p4" },
] as const;

const guideReplies: Record<string, string> = {
  "I can build that once CITYDAY has enough places and experiences in this city.": "guide.planning",
  "CITYDAY does not have a hidden-gem list for this city yet.": "guide.gems",
  "CITYDAY does not have date-night picks for this city yet.": "guide.date",
  "CITYDAY does not have scheduled events for this city yet.": "guide.events",
};

export function GuideScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ from?: string; ask?: string }>();
  const placeName = useDiscoveryLocation((state) => state.selected?.label) ?? t("guide.chooseCity");
  const from = typeof params.from === "string" ? params.from : "CITYDAY";
  const asked = typeof params.ask === "string" ? params.ask : "";
  const [message, setMessage] = useState("");
  const [prompt, setPrompt] = useState<string | null>(null);
  const [promptSource, setPromptSource] = useState<string | null>(null);
  const [reply, setReply] = useState<string | null>(null);

  function nearestBrowse(text: string): { label: string; query: string } | null {
    const lowered = text.toLowerCase();
    if (/\b(first date|date night)\b/.test(lowered)) return { label: t("guide.browseRestaurants"), query: "restaurants" };
    if (/\bitinerary\b|\bhidden gems?\b|\bwhat(?:'s| is) happening\b/.test(lowered)) return { label: t("guide.browseThings"), query: "things to do" };
    return null;
  }

  function ask(text: string, shown?: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const guide = classifyGuideRequest(trimmed);
    if (!guide.searchQuery) {
      setPrompt(shown ?? trimmed);
      setPromptSource(trimmed);
      const replyKey = guide.message ? guideReplies[guide.message] : undefined;
      setReply(replyKey ? t(replyKey) : guide.message);
      return;
    }
    setPrompt(null);
    setPromptSource(null);
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
          <CityText size="title">{t("guide.ask")}</CityText>
          <CityText size="meta" tone="muted">
            {placeName} · {from === "Home" ? t("tabs.home") : from === "Explore" ? t("tabs.explore") : from}
          </CityText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t("common.close")} onPress={() => leave(router, "/")} style={styles.close}>
          <Ionicons name="close" size={20} color={city.ink} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <CityText>
          {t("guide.body")}
        </CityText>
        {prompt && reply ? (
          <View style={styles.exchange}>
            <CityText size="caption" tone="quiet">
              {t("guide.you").toLocaleUpperCase()}
            </CityText>
            <CityText>{prompt}</CityText>
            <CityText size="caption" tone="quiet">
              CITYDAY
            </CityText>
            <CityText>{reply}</CityText>
            {nearestBrowse(promptSource ?? "") ? (
              <QuietButton label={nearestBrowse(promptSource ?? "")?.label ?? t("guide.browse")} onPress={() => router.push({ pathname: "/results", params: { q: nearestBrowse(promptSource ?? "")?.query ?? "things to do" } })} />
            ) : null}
          </View>
        ) : null}
        <View style={styles.prompts}>
          {prompts.map((item) => (
            <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={t(item.key)} onPress={() => ask(item.ask, t(item.key))} style={styles.prompt}>
              <CityText size="meta">{t(item.key)}</CityText>
            </Pressable>
          ))}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t("evening.title")} onPress={() => router.push("/evening")}>
          <CityText size="section">{t("evening.title")}</CityText>
        </Pressable>
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          accessibilityLabel={t("guide.messageLabel")}
          value={message}
          onChangeText={setMessage}
          placeholder={t("guide.message")}
          placeholderTextColor={city.quiet}
          style={styles.input}
          returnKeyType="send"
          onSubmitEditing={() => ask(message)}
        />
        <Pressable accessibilityRole="button" accessibilityLabel={t("common.send")} onPress={() => ask(message)} style={styles.send}>
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
