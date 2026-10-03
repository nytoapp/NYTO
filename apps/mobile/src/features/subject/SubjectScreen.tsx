import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { DestinationResolveResponse, SubjectDetail, TripDetail } from "@atlas/contracts";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest } from "../../api/client";
import { CityText, DarkButton, EmptyState, Photo, QuietButton } from "../city/chrome";
import { formatPrice, kindLabel } from "../city/format";
import { city, citySpace } from "../city/theme";
import { friendlyError } from "../../lib/errors";
import { SignInSheet } from "../auth/SignInSheet";
import { useSession } from "../auth/useSession";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function SubjectScreen({ id }: { id: string }) {
  const router = useRouter();
  const { signedIn, refresh } = useSession();
  const [signIn, setSignIn] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["subject", id],
    enabled: id.length > 0,
    queryFn: async () => {
      const response = await apiRequest<SubjectDetail>(`/api/v1/subjects/${id}`);
      if (response.error || !response.data) {
        throw new Error(response.error?.message ?? "This item could not be loaded.");
      }
      return response.data;
    },
  });
  const saved = useQuery({
    queryKey: ["saves"],
    enabled: signedIn,
    queryFn: async () => {
      const response = await apiRequest<{ items: { id: string; subjectId: string }[] }>("/api/v1/saves");
      if (response.error || !response.data) return { items: [] as { id: string; subjectId: string }[] };
      return response.data;
    },
  });
  const trips = useQuery({
    queryKey: ["trips"],
    enabled: signedIn,
    queryFn: async () => {
      const response = await apiRequest<{ items: { id: string; title: string }[] }>("/api/v1/trips");
      if (response.error || !response.data) return { items: [] as { id: string; title: string }[] };
      return response.data;
    },
  });
  const save = useMutation({
    mutationFn: async () => {
      const response = await apiRequest<{ id: string }>("/api/v1/saves", { method: "POST", body: JSON.stringify({ subjectId: id }) });
      if (response.error || !response.data) throw new Error(response.error?.message ?? "Couldn't save this.");
      return response.data;
    },
    onSuccess: () => {
      setPendingSave(false);
      void saved.refetch();
    },
  });
  const addToPlan = useMutation({
    mutationFn: async (tripId: string) => {
      const response = await apiRequest<TripDetail>(`/api/v1/trips/${tripId}/items`, {
        method: "POST",
        body: JSON.stringify({ subjectId: id, slot: "unscheduled" }),
      });
      if (response.error || !response.data) throw new Error(response.error?.message ?? "Couldn't add this to the plan.");
      return response.data;
    },
  });
  const openDestination = useMutation({
    mutationFn: async (destinationId: string) => {
      const response = await apiRequest<DestinationResolveResponse>("/api/v1/destinations/resolve", {
        method: "POST",
        body: JSON.stringify({ destinationId }),
      });
      if (response.error || !response.data) throw new Error(response.error?.message ?? "That link is not available.");
      await Linking.openURL(response.data.preferredUrl);
    },
    onError: (error) => setActionError(friendlyError(error, "That link is not available.")),
  });

  const alreadySaved = saved.data?.items.some((item) => item.subjectId === id) ?? false;

  function onSave() {
    if (!signedIn) {
      setPendingSave(true);
      setSignIn(true);
      return;
    }
    save.mutate();
  }

  if (query.isLoading) {
    return (
      <View style={styles.screen}>
        <View style={styles.skeleton} />
      </View>
    );
  }
  if (query.isError || !query.data) {
    return (
      <View style={styles.screen}>
        <EmptyState title="This didn't load" body={friendlyError(query.error, "Give it another try.")} action="Try again" onAction={() => void query.refetch()} />
      </View>
    );
  }

  const place = query.data;
  const hero = place.images[0]?.url ?? "";
  const price = formatPrice(place.price);
  const action = place.booking.destinationId && place.booking.capability !== "unavailable" ? place.booking.label : null;
  const facts = [place.rating !== null ? place.rating.toFixed(1) : null, place.reviewCount !== null ? `${place.reviewCount} notes` : null, price].filter(Boolean).join(" · ");

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View>
          <Photo uri={hero} style={styles.hero} />
          <View style={styles.heroBar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.round}>
              <Ionicons name="chevron-back" size={22} color={city.ink} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={alreadySaved ? "Saved" : "Save"} onPress={onSave} style={styles.round}>
              <Ionicons name={alreadySaved ? "heart" : "heart-outline"} size={18} color={alreadySaved ? city.danger : city.ink} />
            </Pressable>
          </View>
        </View>
        <View style={styles.body}>
          <CityText size="caption" tone="quiet">
            {[kindLabel(place.kind), place.category, place.locality].filter(Boolean).join(" · ").toUpperCase()}
          </CityText>
          <CityText size="display">{place.title}</CityText>
          {facts ? <CityText tone="muted">{facts}</CityText> : null}
          {place.summary ? <CityText>{place.summary}</CityText> : null}
          {place.hours.length > 0 ? (
            <View style={styles.block}>
              <CityText size="section">Hours</CityText>
              {place.hours.map((hour) => (
                <CityText key={`${hour.weekday}-${hour.opens}`} size="meta" tone="muted">
                  {weekdays[hour.weekday] ?? "Day"} · {hour.opens}–{hour.closes}
                </CityText>
              ))}
            </View>
          ) : null}
          {place.startsAt ? (
            <CityText size="meta" tone="muted">
              {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: place.timezone ?? undefined }).format(new Date(place.startsAt))}
            </CityText>
          ) : null}
          {place.attribution[0] ? (
            <CityText size="caption" tone="quiet">
              {place.attribution[0].text}
            </CityText>
          ) : null}
          {action && place.booking.destinationId ? <DarkButton label={openDestination.isPending ? "Opening" : action} onPress={() => openDestination.mutate(place.booking.destinationId as string)} /> : null}
          {signedIn && trips.data && trips.data.items[0] ? (
            <QuietButton label={`Add to ${trips.data.items[0].title}`} onPress={() => addToPlan.mutate(trips.data.items[0].id)} />
          ) : null}
          {actionError ? <CityText tone="muted">{actionError}</CityText> : null}
          {save.isError ? <CityText tone="muted">{friendlyError(save.error, "Couldn't save this.")}</CityText> : null}
          {addToPlan.isError ? <CityText tone="muted">{friendlyError(addToPlan.error, "Couldn't add this to the plan.")}</CityText> : null}
          {addToPlan.isSuccess ? <CityText tone="muted">Added to the plan.</CityText> : null}
        </View>
      </ScrollView>
      <SignInSheet
        visible={signIn}
        onClose={() => setSignIn(false)}
        onSignedIn={() => {
          void refresh().then(() => {
            if (pendingSave) save.mutate();
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: city.page },
  hero: { width: "100%", height: 360 },
  heroBar: { position: "absolute", top: 52, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between" },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(246,243,238,0.94)", alignItems: "center", justifyContent: "center" },
  body: { padding: citySpace.page, gap: 10 },
  block: { gap: 4, marginTop: 8 },
  skeleton: { flex: 1, margin: citySpace.page, borderRadius: 16, backgroundColor: city.photo },
});
