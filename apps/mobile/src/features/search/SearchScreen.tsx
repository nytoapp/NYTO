import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { leave } from "../nav/leave";
import { useMemo, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { categoryArt } from "../city/category-art";
import { SearchBar } from "../city/search-bar";
import { color, font, fontScaleCap, space } from "../city/theme";
import { browseCategories, popularSearches } from "../discovery/browse";
import { catalogName, ideaName } from "../i18n/labels";
import { useSearchHandoff } from "./handoff";

export function SearchScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const recent = useSearchHandoff((state) => state.recent);
  const remember = useSearchHandoff((state) => state.remember);
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const typing = query.trim().length > 0;

  const suggestions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const ideas = popularSearches.filter((item) => {
      const label = ideaName(item, t).toLowerCase();
      return !needle || item.toLowerCase().includes(needle) || label.includes(needle);
    });
    const categories = browseCategories.filter((item) => {
      const label = catalogName(item.label, t).toLowerCase();
      return !needle || label.includes(needle) || item.label.toLowerCase().includes(needle) || item.query.toLowerCase().includes(needle);
    });
    return { ideas, categories };
  }, [query, i18n.language, t]);

  function go(next: string) {
    const trimmed = next.trim();
    if (!trimmed) return;
    setError(null);
    setSubmitting(true);
    try {
      remember(trimmed);
      router.push({ pathname: "/results", params: { q: trimmed } });
      setSubmitting(false);
    } catch {
      setSubmitting(false);
      setError(t("search.failed"));
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: color.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top + space[8], paddingLeft: space[8], paddingRight: 48, paddingBottom: space[8], flexDirection: "row", alignItems: "center", gap: space[4] }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("common.back")} onPress={() => leave(router, "/")} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="chevron-back" size={22} color={color.primaryText} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <SearchBar
            value={query}
            onChangeText={(value) => {
              setError(null);
              setSubmitting(false);
              setQuery(value);
            }}
            placeholder={t("search.placeholder")}
            accessibilityLabel={t("search.label")}
            autoFocus
            onSubmit={() => go(query)}
          />
        </View>
      </View>
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + space[24], paddingHorizontal: space.page }}>
        {submitting ? (
          <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.bodySmall, { color: color.secondaryText, marginTop: space[16] }]}>
            {t("search.opening")}
          </Text>
        ) : null}
        {error ? (
          <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.bodySmall, { color: color.error, marginTop: space[16] }]}>
            {error}
          </Text>
        ) : null}

        {typing ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t("search.forLabel", { query: query.trim() })} onPress={() => go(query)} style={rowStyle}>
            <Ionicons name="search-outline" size={18} color={color.mutedText} />
            <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.body, { color: color.primaryText, flex: 1 }]}>
              {t("search.for", { query: query.trim() })}
            </Text>
          </Pressable>
        ) : null}

        {!typing && recent.length > 0 ? (
          <View style={{ paddingTop: space[24], gap: space[4] }}>
            <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.caption, { color: color.mutedText }]}>
              {t("search.recent").toLocaleUpperCase()}
            </Text>
            {recent.map((item) => (
              <Pressable key={item} accessibilityRole="button" accessibilityLabel={item} onPress={() => go(item)} style={rowStyle}>
                <Ionicons name="time-outline" size={18} color={color.mutedText} />
                <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.body, { color: color.primaryText, flex: 1 }]}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {suggestions.ideas.length > 0 ? (
          <View style={{ paddingTop: space[24], gap: space[4] }}>
            <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.caption, { color: color.mutedText }]}>
              {t("search.ideas").toLocaleUpperCase()}
            </Text>
            {suggestions.ideas.map((item) => (
              <Pressable key={item} accessibilityRole="button" accessibilityLabel={ideaName(item, t)} onPress={() => go(item)} style={rowStyle}>
                <Ionicons name="sparkles-outline" size={18} color={color.mutedText} />
                <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.body, { color: color.primaryText, flex: 1 }]}>
                  {ideaName(item, t)}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {suggestions.categories.length > 0 ? (
          <View style={{ paddingTop: space[24], gap: space[12] }}>
            <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.caption, { color: color.mutedText }]}>
              {t("search.categories").toLocaleUpperCase()}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[12], paddingVertical: space[4] }}>
              {suggestions.categories.map((item) => (
                <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={catalogName(item.label, t)} onPress={() => go(item.query)} style={{ width: 76, alignItems: "center", gap: space[8] }}>
                  <Image source={categoryArt(item.label)} style={{ width: 64, height: 64, borderRadius: 20 }} />
                  <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} numberOfLines={1} style={[font.caption, { color: color.primaryText }]}>
                    {catalogName(item.label, t)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const rowStyle = { minHeight: 48, flexDirection: "row" as const, alignItems: "center" as const, gap: space[12] };
