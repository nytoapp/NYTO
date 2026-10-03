import type { TripDetail } from "@atlas/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest } from "../../api/client";
import { CityText, EmptyState } from "../city/chrome";
import { city, cityRadius, citySpace } from "../city/theme";
import { friendlyError } from "../../lib/errors";

export function TripDetailScreen() {
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
        <EmptyState title="This plan didn't load" body={friendlyError(trip.error)} action="Back" onAction={() => router.back()} />
      </View>
    );
  }

  const plan = trip.data;
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32, paddingHorizontal: citySpace.page }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={city.ink} />
        </Pressable>
        <CityText size="caption" tone="quiet">
          {plan.destinationLabel.toUpperCase()} · {plan.timezone}
        </CityText>
        <CityText size="display">{plan.title}</CityText>
        <CityText tone="muted">
          {plan.startsOn}
          {plan.endsOn !== plan.startsOn ? ` – ${plan.endsOn}` : ""}
        </CityText>
        {plan.days.map((day) => (
          <View key={day.id} style={styles.day}>
            <CityText size="section">{day.date}</CityText>
            {day.items.length === 0 ? <CityText tone="muted">Nothing on this day yet. Open a place and add it.</CityText> : null}
            {day.items.map((item) => (
              <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.title} onPress={() => router.push(`/subject/${item.subjectId}`)} style={styles.item}>
                <CityText size="meta" tone="quiet">
                  {item.localTime ?? item.slot}
                </CityText>
                <CityText size="section">{item.title}</CityText>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: city.page },
  back: { width: 44, height: 44, justifyContent: "center" },
  day: { marginTop: 22, gap: 8 },
  item: { backgroundColor: city.paper, borderRadius: cityRadius.card, padding: 14, gap: 2, borderWidth: StyleSheet.hairlineWidth, borderColor: city.line },
});
