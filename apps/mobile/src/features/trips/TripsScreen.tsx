import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest } from "../../api/client";
import { CityText, DarkButton, EmptyState } from "../city/chrome";
import { ListSkeleton } from "../city/skeleton";
import { city, cityRadius, citySpace } from "../city/theme";
import { useSession } from "../auth/useSession";
import { useDiscoveryLocation } from "../location/location-store";
import { loadTrips, readTripList } from "./trip-list";

export function TripsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signedIn, restoring } = useSession();
  const selected = useDiscoveryLocation((state) => state.selected);
  const [createError, setCreateError] = useState<string | null>(null);
  const trips = useQuery({
    queryKey: ["trips"],
    enabled: signedIn,
    queryFn: loadTrips,
  });
  const plans = readTripList(trips.data);
  const exploreLabel = selected ? `Explore ${selected.label}` : "Choose a city";
  const startLabel = selected ? `Start a plan in ${selected.label}` : "Choose a city";
  const loading = restoring || (signedIn && (trips.isLoading || (!trips.isSuccess && !trips.isError)));
  const failed = signedIn && trips.isError;
  const empty = signedIn && trips.isSuccess && plans.length === 0 && !loading;
  const loaded = signedIn && trips.isSuccess && plans.length > 0 && !loading && !failed;

  async function createPlan() {
    if (!selected) {
      router.push("/city");
      return;
    }
    setCreateError(null);
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: selected.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const response = await apiRequest<{ id: string }>("/api/v1/trips", {
      method: "POST",
      body: JSON.stringify({ destinationLocationId: selected.id, startsOn: day, endsOn: day, title: `A day in ${selected.label}` }),
    });
    if (response.error || !response.data?.id) {
      setCreateError(response.error?.message ?? "The plan could not be started.");
      return;
    }
    await trips.refetch();
    router.push(`/trip/${response.data.id}`);
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <View style={styles.pad}>
          <CityText size="display">Plans</CityText>
          <CityText tone="muted">Evenings and trips saved to your account.</CityText>
        </View>
        {!restoring && !signedIn ? (
          <EmptyState
            title="Your plans live here"
            body="Log in to save evenings, trips, and places you want to come back to."
            action="Log in"
            onAction={() => router.push({ pathname: "/sign-in", params: { mode: "login" } })}
            secondary={exploreLabel}
            onSecondary={() => router.push(selected ? "/explore" : "/city")}
          />
        ) : null}
        {loading ? (
          <View style={styles.pad}>
            <ListSkeleton />
          </View>
        ) : null}
        {failed && !loading ? (
          <EmptyState title="Couldn't load your plans" body="We couldn't retrieve your plans right now." action="Try again" onAction={() => void trips.refetch()} />
        ) : null}
        {empty ? <EmptyState title="No plans yet" body="When you start an evening or a trip, it will show up here." action={startLabel} onAction={() => void createPlan()} /> : null}
        {loaded
          ? plans.map((trip) => (
              <Pressable key={trip.id} accessibilityRole="button" accessibilityLabel={trip.title} onPress={() => router.push(`/trip/${trip.id}`)} style={styles.card}>
                <CityText size="caption" tone="quiet">
                  {formatPlanDate(trip.startsOn)}
                  {trip.endsOn !== trip.startsOn ? ` – ${formatPlanDate(trip.endsOn)}` : ""}
                </CityText>
                <CityText size="title">{trip.title}</CityText>
                <CityText tone="muted">{trip.destinationLabel}</CityText>
              </Pressable>
            ))
          : null}
        {createError ? (
          <View style={styles.pad}>
            <CityText tone="muted">{createError}</CityText>
          </View>
        ) : null}
        {loaded && selected ? (
          <View style={styles.pad}>
            <DarkButton label={startLabel} onPress={() => void createPlan()} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function formatPlanDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: city.page },
  pad: { paddingHorizontal: citySpace.page, gap: 8, marginBottom: 12 },
  card: { marginHorizontal: citySpace.page, marginTop: 12, backgroundColor: city.paper, borderRadius: cityRadius.card, padding: 16, gap: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: city.line },
});
