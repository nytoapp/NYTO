import type { GeoCandidate } from "@atlas/contracts";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { leave } from "../nav/leave";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest } from "../../api/client";
import { IconButton } from "../city/buttons";
import { EmptyState } from "../city/chrome";
import { SearchBar } from "../city/search-bar";
import { color, font, fontScaleCap, space } from "../city/theme";
import { friendlyError } from "../../lib/errors";
import { useDiscoveryLocation, type SelectedLocation } from "./location-store";

export function CityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const selected = useDiscoveryLocation((state) => state.selected);
  const setSelected = useDiscoveryLocation((state) => state.setSelected);
  const [query, setQuery] = useState("");
  const cities = useQuery({
    queryKey: ["geo-suggest", query.trim()],
    queryFn: async () => {
      const params = new URLSearchParams({ q: query.trim() });
      const response = await apiRequest<{ candidates: GeoCandidate[] }>(`/api/v1/geo/suggest?${params.toString()}`);
      if (response.error || !response.data || !Array.isArray(response.data.candidates)) {
        throw new Error(response.error?.message ?? t("city.loadFailed"));
      }
      return response.data.candidates;
    },
  });

  function choose(city: GeoCandidate) {
    const next: SelectedLocation = {
      id: city.id,
      label: city.label,
      countryCode: city.countryCode,
      timezone: city.timezone,
    };
    setSelected(next);
    leave(router, "/");
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.background }}>
      <StatusBar style="dark" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + space[8], paddingBottom: insets.bottom + space[32], paddingHorizontal: space.page, gap: space[16] }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: space[8] }}>
          <IconButton label={t("common.back")} icon="chevron-back" onPress={() => leave(router, "/")} />
          <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.h1, { color: color.primaryText, flex: 1 }]}>
            {t("city.title")}
          </Text>
        </View>
        <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.body, { color: color.secondaryText }]}>
          {t("city.body")}
        </Text>
        <SearchBar value={query} onChangeText={setQuery} placeholder={t("city.search")} accessibilityLabel={t("city.search")} autoCapitalize="words" />
        {cities.isError ? (
          <EmptyState title={t("city.failed")} body={friendlyError(cities.error, t("city.again"))} action={t("common.tryAgain")} onAction={() => void cities.refetch()} />
        ) : null}
        {(Array.isArray(cities.data) ? cities.data : []).map((city) => {
          const on = selected?.id === city.id;
          return (
            <Pressable
              key={city.id}
              accessibilityRole="button"
              accessibilityLabel={`${city.label}, ${city.countryCode}`}
              accessibilityState={{ selected: on }}
              onPress={() => choose(city)}
              style={{ minHeight: 48, justifyContent: "center" }}
            >
              <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.bodyMedium, { color: color.primaryText }]}>
                {city.label}
              </Text>
              <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.caption, { color: color.mutedText }]}>
                {city.countryCode}
                {on ? ` · ${t("city.selected")}` : ""}
              </Text>
            </Pressable>
          );
        })}
        {cities.isSuccess && Array.isArray(cities.data) && cities.data.length === 0 ? (
          <EmptyState title={t("city.none")} body={t("city.noneBody")} />
        ) : null}
        {selected ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("city.clear")}
            onPress={() => {
              setSelected(null);
              leave(router, "/");
            }}
            style={{ minHeight: 48, justifyContent: "center" }}
          >
            <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.body, { color: color.secondaryText }]}>
              {t("city.clear")}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}
