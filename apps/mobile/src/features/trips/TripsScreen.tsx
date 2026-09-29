import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tripCreateRequestSchema, type TripDetail } from "@atlas/contracts";
import { DestinationChip, Rail, SectionHeader, TripCard } from "../../components/discovery";
import { AppText, Button, Card, EmptyState, ErrorState, Screen, SearchField, Skeleton } from "../../components/ui";
import { space } from "../../components/theme/tokens";
import { friendlyError } from "../../lib/errors";
import { apiRequest } from "../../api/client";
import { SignInSheet } from "../auth/SignInSheet";
import { useSession } from "../auth/useSession";
import { destinations } from "../discovery/browse";
import { useDiscoveryLocation } from "../location/location-store";

type TripList = {
  items: { id: string; title: string; startsOn: string; endsOn: string; destinationLabel: string }[];
};

export function TripsScreen() {
  const { signedIn, refresh } = useSession();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const selected = useDiscoveryLocation((state) => state.selected);
  const setSelected = useDiscoveryLocation((state) => state.setSelected);
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [openTrip, setOpenTrip] = useState<string | null>(null);
  const trips = useQuery({
    queryKey: ["trips"],
    enabled: signedIn,
    queryFn: async () => {
      const response = await apiRequest<TripList>("/api/v1/trips");
      if (response.error || !response.data) throw new Error(response.error?.message ?? "Trips are unavailable.");
      return response.data;
    },
  });
  const detail = useQuery({
    queryKey: ["trip", openTrip],
    enabled: signedIn && openTrip !== null,
    queryFn: async () => {
      const response = await apiRequest<TripDetail>(`/api/v1/trips/${openTrip}`);
      if (response.error || !response.data) throw new Error(response.error?.message ?? "That trip is not available.");
      return response.data;
    },
  });
  const create = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Choose a destination first.");
      const parsed = tripCreateRequestSchema.safeParse({
        destinationLocationId: selected.id,
        startsOn,
        endsOn,
        title: title.trim() || null,
      });
      if (!parsed.success) throw new Error("Use dates like 2026-10-02, with the end on or after the start.");
      const response = await apiRequest("/api/v1/trips", { method: "POST", body: JSON.stringify(parsed.data) });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: async () => {
      setCreating(false);
      setTitle("");
      setStartsOn("");
      setEndsOn("");
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
    onError: (error) => setFormError(friendlyError(error, "The trip could not be created.")),
  });

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.page, { flexGrow: 1 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <AppText role="brand" tone="tertiary">
            PLANNING
          </AppText>
          <AppText role="title">Build your evening</AppText>
          <AppText tone="muted">Put a few good things together.</AppText>
        </View>
        {!signedIn ? (
          <View style={styles.fill}>
            <View style={styles.sketch}>
              {["Dinner", "Drinks", "Event"].map((item, index) => (
                <View key={item} style={styles.sketchRow}>
                  <AppText role="caption" tone="tertiary">
                    {String(index + 1).padStart(2, "0")}
                  </AppText>
                  <AppText role="headline">{item}</AppText>
                </View>
              ))}
            </View>
            <AppText tone="muted">Keep your plans with you.</AppText>
            <Button label="Log in" onPress={() => setOpen(true)} />
          </View>
        ) : null}
        {signedIn && trips.isLoading ? <Skeleton height={120} /> : null}
        {signedIn && trips.isError ? (
          <ErrorState title="Nothing came through." body="Give it another try." onRetry={() => void trips.refetch()} />
        ) : null}
        {signedIn && trips.data ? (
          <View style={styles.stack}>
            <SectionHeader title="Upcoming" action={creating ? "Close" : "New trip"} onAction={() => setCreating((value) => !value)} />
            {creating ? (
              <Card>
                <AppText role="label">Destination</AppText>
                <Rail>
                  {destinations
                    .filter((item) => item.location)
                    .map((destination) => (
                      <DestinationChip
                        key={destination.label}
                        label={destination.label}
                        selected={selected?.id === destination.location?.id}
                        onPress={() => destination.location && setSelected(destination.location)}
                      />
                    ))}
                </Rail>
                <SearchField value={title} onChangeText={setTitle} placeholder="Trip name" hideIcon />
                <SearchField value={startsOn} onChangeText={setStartsOn} placeholder="Starts 2026-10-02" hideIcon autoCapitalize="none" />
                <SearchField value={endsOn} onChangeText={setEndsOn} placeholder="Ends 2026-10-05" hideIcon autoCapitalize="none" />
                {formError ? <AppText role="caption" tone="muted">{formError}</AppText> : null}
                <Button label={create.isPending ? "Creating" : "Create trip"} onPress={() => create.mutate()} disabled={create.isPending} />
              </Card>
            ) : null}
            {trips.data.items.length === 0 && !creating ? (
              <EmptyState title="Nothing planned yet" body="Put a few good things together." action={<Button label="Create a plan" onPress={() => setCreating(true)} />} />
            ) : null}
            {trips.data.items.map((trip) => (
              <TripCard
                key={trip.id}
                title={trip.title}
                destination={trip.destinationLabel}
                dates={`${trip.startsOn} – ${trip.endsOn}`}
                onPress={() => setOpenTrip((current) => (current === trip.id ? null : trip.id))}
              />
            ))}
            {openTrip && detail.isLoading ? <Skeleton height={120} /> : null}
            {openTrip && detail.isError ? <ErrorState title="This plan did not load." body="Give it another try." onRetry={() => void detail.refetch()} /> : null}
            {detail.data && detail.data.id === openTrip ? <TripTimeline trip={detail.data} /> : null}
          </View>
        ) : null}
      </ScrollView>
      <SignInSheet visible={open} onClose={() => setOpen(false)} onSignedIn={() => void refresh()} />
    </Screen>
  );
}

function TripTimeline({ trip }: { trip: TripDetail }) {
  if (trip.days.length === 0) {
    return <EmptyState title="Nothing on this plan yet" body="Places you add will line up here by day and time." />;
  }
  return (
    <View style={styles.stack}>
      {trip.days.map((day) => (
        <View key={day.id} style={styles.stack}>
          <AppText role="caption" tone="muted">
            {new Date(`${day.date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}
          </AppText>
          {day.items.map((item) => (
            <View key={item.id}>
              <AppText role="label">{item.localTime ?? item.slot}</AppText>
              <AppText role="headline">{item.title}</AppText>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: space[5], paddingTop: space[3], paddingBottom: space[8] },
  fill: { flex: 1, justifyContent: "center", gap: space[4] },
  sketch: { gap: space[3] },
  sketchRow: { flexDirection: "row", alignItems: "baseline", gap: space[3] },
  intro: { gap: 4 },
  stack: { gap: space[3] },
});
