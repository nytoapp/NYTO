import type { TripDetail } from "@atlas/contracts";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest } from "../../api/client";
import { CityText, EmptyState } from "../city/chrome";
import { city, cityRadius, citySpace, serif } from "../city/theme";
import { friendlyError } from "../../lib/errors";
import { partHint, partLabel, placeCount } from "../i18n/labels";
import { civilParts, dayParts } from "./trip-list";
import { leave } from "../nav/leave";

export function TripDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripId = typeof id === "string" ? id : "";
  const trip = useQuery({
    queryKey: ["trip", tripId],
    enabled: tripId.length > 0,
    queryFn: async () => {
      const response = await apiRequest<TripDetail>(`/api/v1/trips/${tripId}`);
      if (response.error || !response.data) throw new Error(response.error?.message ?? "That plan is not available.");
      return response.data;
    },
  });

  if (trip.isLoading) {
    return <View style={styles.screen} />;
  }
  if (trip.isError || !trip.data) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <EmptyState title={t("plans.failed")} body={friendlyError(trip.error)} action={t("common.back")} onAction={() => leave(router, "/trips")} />
      </View>
    );
  }

  const plan = trip.data;
  const date = civilParts(plan.startsOn);
  const places = plan.days.flatMap((day) => day.items);
  const countLabel = placeCount(places.length, t);
  const end = civilParts(plan.endsOn);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 48, paddingHorizontal: citySpace.page }} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("common.back")} onPress={() => leave(router, "/trips")} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={city.ink} />
        </Pressable>
        <CityText size="caption" tone="quiet">
          {plan.destinationLabel.toUpperCase()}
        </CityText>
        <View style={styles.lockup}>
          <Text allowFontScaling maxFontSizeMultiplier={1.2} style={styles.dayNumber}>
            {date.day}
          </Text>
          <View style={styles.lockupCopy}>
            <CityText size="section">{date.weekday}</CityText>
            <CityText tone="muted">{date.month}</CityText>
          </View>
        </View>
        <CityText size="meta" tone="quiet">
          {countLabel}
          {plan.endsOn !== plan.startsOn ? ` · ${t("plans.through", { day: end.day, month: end.month })}` : ""}
        </CityText>
        <View style={styles.parts}>
          {dayParts.map((part) => {
            const items = places.filter((item) => (part.slots as readonly string[]).includes(item.slot));
            return (
              <View key={part.id} style={styles.part}>
                <View style={styles.partHead}>
                  <CityText size="section">{partLabel(part.id, t)}</CityText>
                  <CityText size="meta" tone="quiet">
                    {items.length === 0 ? partHint(part.id, t) : placeCount(items.length, t)}
                  </CityText>
                </View>
                {items.map((item, index) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={item.title}
                    onPress={() => router.push(`/subject/${item.subjectId}`)}
                    style={[styles.item, index > 0 && styles.itemRule]}
                  >
                    <Text allowFontScaling maxFontSizeMultiplier={1.2} style={styles.index}>
                      {index + 1}
                    </Text>
                    <View style={styles.itemCopy}>
                      <CityText size="section" numberOfLines={2}>
                        {item.title}
                      </CityText>
                      {item.localTime ? (
                        <CityText size="meta" tone="quiet">
                          {item.localTime}
                        </CityText>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={city.quiet} />
                  </Pressable>
                ))}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("plans.addPart", { part: partLabel(part.id, t).toLocaleLowerCase() })}
                  onPress={() =>
                    router.push({
                      pathname: "/results",
                      params: { q: part.query, plan: plan.id, slot: part.slot },
                    })
                  }
                  style={[styles.add, items.length > 0 && styles.itemRule]}
                >
                  <View style={styles.plus}>
                    <Ionicons name="add" size={16} color={city.ink} />
                  </View>
                  <CityText size="meta">{t("plans.addPlace")}</CityText>
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: city.page },
  back: { width: 44, height: 44, justifyContent: "center", marginLeft: -8 },
  lockup: { flexDirection: "row", alignItems: "flex-end", gap: 12, marginTop: 8 },
  dayNumber: { fontFamily: serif, fontSize: 56, lineHeight: 60, color: city.ink, fontWeight: "500" },
  lockupCopy: { paddingBottom: 8, gap: 0 },
  parts: { marginTop: 28, gap: 16 },
  part: { backgroundColor: city.paper, borderRadius: cityRadius.card, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: city.line },
  partHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 },
  item: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  index: { width: 22, fontFamily: serif, fontSize: 16, lineHeight: 20, color: city.quiet },
  itemRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: city.line },
  itemCopy: { flex: 1, gap: 2 },
  add: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 10 },
  plus: { width: 28, height: 28, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: city.line, alignItems: "center", justifyContent: "center" },
});
