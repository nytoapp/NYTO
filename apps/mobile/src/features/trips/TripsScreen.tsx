import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tripCreateRequestSchema } from "@atlas/contracts";
import { DestinationChip, Rail, SectionHeader, TripCard } from "../../components/discovery";
import { AppText, Button, Card, EmptyState, ErrorState, Screen, SearchField } from "../../components/ui";
import { space } from "../../components/theme/tokens";
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
  const trips = useQuery({
    queryKey: ["trips"],
    enabled: signedIn,
    queryFn: async () => {
      const response = await apiRequest<TripList>("/api/v1/trips");
      if (response.error || !response.data) throw new Error(response.error?.message ?? "Trips are unavailable.");
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
    onError: (error) => setFormError(error instanceof Error ? error.message : "The trip could not be created."),
  });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <AppText role="caption" tone="muted">
            Planning
          </AppText>
          <AppText role="title">Trips</AppText>
        </View>
        {!signedIn ? (
          <Card>
            <AppText role="headline">A trip keeps a destination and dates together</AppText>
            <AppText tone="muted">It stays separate from the city you are standing in. Sign in to plan one.</AppText>
            <Button label="Sign in" onPress={() => setOpen(true)} />
          </Card>
        ) : null}
        {signedIn && trips.isLoading ? <AppText tone="muted">Loading trips</AppText> : null}
        {signedIn && trips.isError ? (
          <ErrorState title="Trips could not be loaded" body={trips.error instanceof Error ? trips.error.message : "Try again."} onRetry={() => void trips.refetch()} />
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
                {formError ? <AppText role="caption" tone="clay">{formError}</AppText> : null}
                <Button label={create.isPending ? "Creating" : "Create trip"} onPress={() => create.mutate()} disabled={create.isPending} />
              </Card>
            ) : null}
            {trips.data.items.length === 0 && !creating ? (
              <EmptyState title="No trips yet" body="Pick a destination and a few dates. The plan stays with your account." action={<Button label="Create a trip" onPress={() => setCreating(true)} />} />
            ) : null}
            {trips.data.items.map((trip) => (
              <TripCard key={trip.id} title={trip.title} destination={trip.destinationLabel} dates={`${trip.startsOn} – ${trip.endsOn}`} />
            ))}
          </View>
        ) : null}
      </ScrollView>
      <SignInSheet visible={open} onClose={() => setOpen(false)} onSignedIn={() => void refresh()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: space[5], paddingTop: space[3], paddingBottom: space[8] },
  intro: { gap: 4 },
  stack: { gap: space[3] },
});
