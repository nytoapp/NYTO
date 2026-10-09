import type { DestinationResolveResponse } from "@atlas/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { leave } from "../nav/leave";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest } from "../../api/client";
import { loadSubject } from "../subject/load-subject";
import { CityText, DarkButton, EmptyState, Photo } from "../city/chrome";
import { city, cityRadius, citySpace } from "../city/theme";
import { appSentence } from "../i18n/labels";

export function BookingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const subjectId = typeof id === "string" ? id : "";
  const subject = useQuery({
    queryKey: ["subject", subjectId],
    enabled: subjectId.length > 0,
    queryFn: () => loadSubject(subjectId),
  });
  const open = useMutation({
    mutationFn: async (destinationId: string) => {
      const response = await apiRequest<DestinationResolveResponse>("/api/v1/destinations/resolve", {
        method: "POST",
        body: JSON.stringify({ destinationId }),
      });
      if (response.error || !response.data) throw new Error(response.error?.message ?? t("book.link"));
      await Linking.openURL(response.data.preferredUrl);
    },
  });
  const place = subject.data;
  const destinationId = place?.booking.destinationId;
  const rawLabel = place && destinationId && place.booking.capability !== "unavailable" ? place.booking.label : null;
  const label = rawLabel ? appSentence(rawLabel, t) : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <StatusBar style="dark" />
      <Pressable accessibilityRole="button" accessibilityLabel={t("common.back")} onPress={() => leave(router, "/")} style={styles.back}>
        <Ionicons name="chevron-back" size={24} color={city.ink} />
      </Pressable>
      <CityText size="display">{t("book.continue")}</CityText>
      {place ? (
        <View style={styles.venue}>
          <Photo uri={place.images[0]?.url ?? ""} style={styles.thumb} />
          <View style={styles.copy}>
            <CityText size="section">{place.title}</CityText>
            <CityText size="meta" tone="muted">
              {place.locality}
            </CityText>
          </View>
        </View>
      ) : null}
      <View style={styles.flex} />
      {!label ? <EmptyState title={t("book.none")} body={t("book.noneBody")} /> : <DarkButton label={label} onPress={() => open.mutate(destinationId as string)} />}
      {open.isError ? <CityText tone="muted">{t("book.link")}</CityText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: city.page, paddingHorizontal: citySpace.page },
  back: { width: 44, height: 44, justifyContent: "center" },
  venue: { flexDirection: "row", gap: 12, alignItems: "center", marginTop: 16 },
  thumb: { width: 72, height: 72, borderRadius: cityRadius.image },
  copy: { flex: 1, gap: 2 },
  flex: { flex: 1 },
});
