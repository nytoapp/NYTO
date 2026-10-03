import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest } from "../../api/client";
import { CityText, DarkButton, EmptyState } from "../city/chrome";
import { city, cityRadius, citySpace } from "../city/theme";
import { useSession } from "../auth/useSession";
import { useDiscoveryLocation } from "../location/location-store";
import { friendlyError } from "../../lib/errors";

type TripListItem = {
  id: string;
  title: string;
  startsOn: string;
  endsOn: string;
  timezone: string;
  destinationLabel: string;
};

export function TripsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signedIn } = useSession();
  const selected = useDiscoveryLocation((state) => state.selected);
  const trips = useQuery({
    queryKey: ["trips"],
    enabled: signedIn,
    queryFn: async () => {
      const response = await apiRequest<{ items: TripListItem[] }>("/api/v1/trips");
      if (response.error || !response.data) {
        throw new Error(response.error?.message ?? "Plans could not be loaded.");
      }
      return response.data.items;
    },
  });

  async function createPlan() {
    if (!selected) return;
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: selected.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const response = await apiRequest<{ id: string }>("/api/v1/trips", {
      method: "POST",
      body: JSON.stringify({ destinationLocationId: selected.id, startsOn: day, endsOn: day, title: `A day in ${selected.label}` }),
    });
    if (response.data?.id) {
      await trips.refetch();
      router.push(`/trip/${response.data.id}`);
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <View style={styles.pad}>
          <CityText size="display">Plans</CityText>
          <CityText tone="muted">Evenings and trips saved to your account.</CityText>
        </View>
        {!signedIn ? <EmptyState title="Sign in to keep a plan" body="Plans stay with your CITYDAY account." action="Log in" onAction={() => router.push("/sign-in")} /> : null}
        {signedIn && trips.isError ? <EmptyState title="Plans didn't load" body={friendlyError(trips.error)} action="Try again" onAction={() => void trips.refetch()} /> : null}
        {signedIn && trips.data && trips.data.length === 0 ? <EmptyState title="No plans yet" body={selected ? `Start one for ${selected.label}.` : "Choose a city on Home, then start a plan."} /> : null}
        {trips.data?.map((trip) => (
          <Pressable key={trip.id} accessibilityRole="button" accessibilityLabel={trip.title} onPress={() => router.push(`/trip/${trip.id}`)} style={styles.card}>
            <CityText size="caption" tone="quiet">
              {trip.startsOn}
              {trip.endsOn !== trip.startsOn ? ` – ${trip.endsOn}` : ""}
            </CityText>
            <CityText size="title">{trip.title}</CityText>
            <CityText tone="muted">{trip.destinationLabel}</CityText>
          </Pressable>
        ))}
        {signedIn && selected ? (
          <View style={styles.pad}>
            <DarkButton label={`Start a plan in ${selected.label}`} onPress={() => void createPlan()} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: city.page },
  pad: { paddingHorizontal: citySpace.page, gap: 8, marginBottom: 12 },
  card: { marginHorizontal: citySpace.page, marginTop: 12, backgroundColor: city.paper, borderRadius: cityRadius.card, padding: 16, gap: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: city.line },
});
