import { useState } from "react";
import { Linking, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DestinationResolveResponse, TripDetail } from "@atlas/contracts";
import { useLocalSearchParams, useRouter } from "expo-router";
import { leave } from "../nav/leave";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest } from "../../api/client";
import { loadSubject } from "./load-subject";
import { useSession } from "../auth/useSession";
import { IconButton, PrimaryButton } from "../city/buttons";
import { EmptyState } from "../city/chrome";
import { formatPrice, kindLabel } from "../city/format";
import { CategoryCover } from "../city/place-card";
import { CityImage } from "../city/image";
import { Skeleton, TextSkeleton } from "../city/skeleton";
import { color, font, fontScaleCap, radius, space } from "../city/theme";
import { friendlyError } from "../../lib/errors";
import { loadSaves, readSaveList } from "../saved/save-list";
import { civilParts, loadTrips, readTripList, type TripRow } from "../trips/trip-list";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function SubjectScreen({ id }: { id: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const heroHeight = Math.round(Math.min(width * 0.92, 360));
  const queryClient = useQueryClient();
  const route = useLocalSearchParams<{ plan?: string; slot?: string }>();
  const routePlan = typeof route.plan === "string" ? route.plan : "";
  const routeSlot = route.slot === "morning" || route.slot === "afternoon" || route.slot === "dinner" ? route.slot : "";
  const [pickedId, setPickedId] = useState(routePlan);
  const { signedIn } = useSession();
  const [actionError, setActionError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["subject", id],
    enabled: id.length > 0,
    queryFn: () => loadSubject(id),
  });
  const saved = useQuery({
    queryKey: ["saves"],
    enabled: signedIn,
    queryFn: loadSaves,
  });
  const trips = useQuery({
    queryKey: ["trips"],
    enabled: signedIn,
    queryFn: loadTrips,
  });
  const save = useMutation({
    mutationFn: async () => {
      const response = await apiRequest<{ id: string }>("/api/v1/saves", { method: "POST", body: JSON.stringify({ subjectId: id }) });
      if (response.error || !response.data) throw new Error(response.error?.message ?? "Couldn't save this.");
      return response.data;
    },
    onSuccess: () => {
      void saved.refetch();
    },
  });
  const addToPlan = useMutation({
    mutationFn: async (input: { tripId: string; slot: "morning" | "afternoon" | "dinner" }) => {
      const response = await apiRequest<TripDetail>(`/api/v1/trips/${input.tripId}/items`, {
        method: "POST",
        body: JSON.stringify({ subjectId: id, slot: input.slot }),
      });
      if (response.error || !response.data) throw new Error(response.error?.message ?? "Couldn't add this to the plan.");
      return response.data;
    },
    onSuccess: async (_data, input) => {
      await queryClient.invalidateQueries({ queryKey: ["trip", input.tripId] });
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      router.dismissTo("/trips");
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

  const alreadySaved = readSaveList(saved.data).some((item) => item.subjectId === id);

  function onSave() {
    if (!signedIn) {
      router.push({ pathname: "/sign-in", params: { mode: "login" } });
      return;
    }
    if (alreadySaved) {
      void apiRequest(`/api/v1/saves/${id}`, { method: "DELETE" }).then((response) => {
        if (response.error) {
          setActionError(response.error.message);
          return;
        }
        void saved.refetch();
      });
      return;
    }
    save.mutate();
  }

  if (query.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: color.background }}>
        <Skeleton height={120} round={0} />
        <View style={{ position: "absolute", top: insets.top + space[8], left: space[16] }}>
          <RoundControl label="Back" icon="chevron-back" onPress={() => leave(router, "/")} />
        </View>
        <View style={{ padding: space.page, gap: space[12] }}>
          <TextSkeleton width="40%" />
          <TextSkeleton width="78%" />
          <TextSkeleton width="56%" />
          <Skeleton height={14} />
          <Skeleton height={48} round={radius.pill} />
        </View>
      </View>
    );
  }
  if (query.isError || !query.data) {
    return (
      <View style={{ flex: 1, backgroundColor: color.background, paddingTop: insets.top, paddingHorizontal: space.page }}>
        <IconButton label="Back" icon="chevron-back" onPress={() => leave(router, "/")} />
        <EmptyState title="This didn't load" body={friendlyError(query.error, "Give it another try.")} action="Try again" onAction={() => void query.refetch()} />
      </View>
    );
  }

  const place = query.data;
  const price = formatPrice(place.price);
  const images = Array.isArray(place.images) ? place.images : [];
  const hours = Array.isArray(place.hours) ? place.hours : [];
  const attribution = Array.isArray(place.attribution) ? place.attribution : [];
  const openPlans = readTripList(trips.data).filter((trip) => trip.status !== "past");
  const chosen = openPlans.find((trip) => trip.id === pickedId) ?? openPlans.find((trip) => trip.id === routePlan) ?? openPlans.find((trip) => trip.status === "current") ?? openPlans[0];
  const external = place.booking?.destinationId && place.booking.capability !== "unavailable" ? place.booking : null;
  const externalLabel = external?.capability === "website" || !external?.label ? "Open website" : external.label;

  return (
    <View style={{ flex: 1, backgroundColor: color.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space[40] }} showsVerticalScrollIndicator={false}>
        <View>
          {images.length > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {images.map((image) => (
                <CityImage key={`${image.position}-${image.url}`} uri={image.url} alt={image.alt ?? place.title} style={{ width, height: heroHeight }} />
              ))}
            </ScrollView>
          ) : (
            <CategoryCover label={place.category ?? kindLabel(place.kind)} style={{ width, height: heroHeight }} />
          )}
          <View style={{ position: "absolute", top: insets.top + space[8], left: space[16], right: space[16], flexDirection: "row", justifyContent: "space-between" }}>
            <RoundControl label="Back" icon="chevron-back" onPress={() => leave(router, "/")} />
            <RoundControl label={alreadySaved ? "Saved" : "Save for later"} icon={alreadySaved ? "bookmark" : "bookmark-outline"} onPress={onSave} />
          </View>
          {place.category || place.kind ? (
            <View style={{ position: "absolute", left: space[16], bottom: space[16], paddingHorizontal: space[12], paddingVertical: space[8], borderRadius: radius.pill, backgroundColor: "rgba(255,252,248,0.92)" }}>
              <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.caption, { color: color.primaryText }]}>
                {(place.category ?? kindLabel(place.kind)).toUpperCase()}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={{ padding: space.page, gap: space[12] }}>
          <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.display, { color: color.primaryText }]}>
            {place.title}
          </Text>
          {place.locality ? (
            <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.body, { color: color.secondaryText }]}>
              {place.locality}
              {place.countryCode ? ` · ${place.countryCode}` : ""}
            </Text>
          ) : null}
          {place.rating !== null || place.reviewCount !== null || price ? (
            <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.bodyMedium, { color: color.primaryText }]}>
              {[place.rating !== null ? place.rating.toFixed(1) : null, place.reviewCount !== null ? `${place.reviewCount} notes` : null, price]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          ) : null}
          {place.summary ? (
            <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.body, { color: color.primaryText }]}>
              {place.summary}
            </Text>
          ) : null}
          {hours.length > 0 ? (
            <View style={{ gap: space[4], marginTop: space[8] }}>
              <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.h3, { color: color.primaryText }]}>
                Hours
              </Text>
              {hours.map((hour) => (
                <Text key={`${hour.weekday}-${hour.opens}`} allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.bodySmall, { color: color.secondaryText }]}>
                  {weekdays[hour.weekday] ?? "Day"} · {hour.opens}–{hour.closes}
                </Text>
              ))}
            </View>
          ) : null}
          {place.startsAt ? (
            <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.bodySmall, { color: color.secondaryText }]}>
              {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: place.timezone ?? undefined }).format(new Date(place.startsAt))}
            </Text>
          ) : null}
          {place.phone ? (
            <Pressable accessibilityRole="link" accessibilityLabel={`Call ${place.phone}`} onPress={() => void Linking.openURL(`tel:${place.phone}`)}>
              <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.bodyMedium, { color: color.primaryText }]}>
                {place.phone}
              </Text>
            </Pressable>
          ) : null}
          {attribution[0] ? (
            <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.caption, { color: color.mutedText }]}>
              {attribution[0].text}
            </Text>
          ) : null}
          {external?.destinationId ? (
            <View style={{ gap: space[8], marginTop: space[8] }}>
              <PrimaryButton label={openDestination.isPending ? "Opening" : externalLabel} onPress={() => openDestination.mutate(external.destinationId as string)} />
              <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.bodySmall, { color: color.secondaryText }]}>
                This opens outside CITYDAY. Nothing is booked inside the app.
              </Text>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={alreadySaved ? "Saved" : "Save for later"}
            onPress={onSave}
            style={{
              minHeight: 72,
              borderRadius: radius.large,
              borderWidth: 1,
              borderColor: alreadySaved ? color.success : color.border,
              backgroundColor: alreadySaved ? "#F3F6F4" : color.surface,
              paddingHorizontal: space[16],
              flexDirection: "row",
              alignItems: "center",
              gap: space[12],
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: radius.pill, backgroundColor: alreadySaved ? color.success : color.accentSoft, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={alreadySaved ? "bookmark" : "bookmark-outline"} size={18} color={alreadySaved ? color.onAccent : color.primaryText} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.bodyMedium, { color: color.primaryText }]}>
                {alreadySaved ? "Saved" : "Save for later"}
              </Text>
              <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.bodySmall, { color: color.secondaryText }]}>
                {alreadySaved ? "In Saved. Tap to take it off." : "Keeps the place. It does not go on a day."}
              </Text>
            </View>
          </Pressable>
          {signedIn && chosen ? (
            <View style={{ gap: space[12] }}>
              <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.h3, { color: color.primaryText }]}>
                {dayHeading(chosen)}
              </Text>
              {openPlans.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[8] }}>
                  {openPlans.map((trip) => {
                    const on = trip.id === chosen.id;
                    const date = civilParts(trip.startsOn);
                    const label = trip.status === "current" ? "Today" : `${date.weekdayShort} ${date.day}`;
                    return (
                      <Pressable
                        key={trip.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        accessibilityLabel={label}
                        onPress={() => setPickedId(trip.id)}
                        style={{ minHeight: 36, paddingHorizontal: space[12], borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: on ? color.accent : color.surface, borderWidth: 1, borderColor: on ? color.accent : color.border }}
                      >
                        <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.label, { color: on ? color.onAccent : color.primaryText }]}>
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : null}
              <View style={{ flexDirection: "row", gap: space[8] }}>
                {(
                  [
                    ["Morning", "morning"],
                    ["Afternoon", "afternoon"],
                    ["Evening", "dinner"],
                  ] as const
                ).map(([label, slot]) => (
                  <Pressable
                    key={slot}
                    accessibilityRole="button"
                    accessibilityLabel={`Add to the ${label.toLowerCase()}`}
                    disabled={addToPlan.isPending}
                    onPress={() => addToPlan.mutate({ tripId: chosen.id, slot })}
                    style={{ flex: 1, minHeight: 48, borderRadius: radius.pill, borderWidth: 1, borderColor: routeSlot === slot ? color.accent : color.border, alignItems: "center", justifyContent: "center", backgroundColor: routeSlot === slot ? color.accent : color.surface, opacity: addToPlan.isPending ? 0.6 : 1 }}
                  >
                    <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.label, { color: routeSlot === slot ? color.onAccent : color.primaryText }]}>
                      {addToPlan.isPending ? "Adding" : label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          {signedIn && !chosen && trips.isSuccess ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Open Plans" onPress={() => router.dismissTo("/trips")} style={{ minHeight: 48, justifyContent: "center" }}>
              <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.bodyMedium, { color: color.primaryText }]}>
                Start a day in Plans
              </Text>
            </Pressable>
          ) : null}
          {actionError ? <Text style={[font.bodySmall, { color: color.error }]}>{actionError}</Text> : null}
          {save.isError ? <Text style={[font.bodySmall, { color: color.error }]}>{friendlyError(save.error, "Couldn't save this.")}</Text> : null}
          {addToPlan.isError ? <Text style={[font.bodySmall, { color: color.error }]}>{friendlyError(addToPlan.error, "Couldn't add this to the plan.")}</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

function dayHeading(trip: TripRow): string {
  if (trip.status === "current") return "Add to today";
  const date = civilParts(trip.startsOn);
  return `Add to ${date.weekday}`;
}

function RoundControl({ label, icon, onPress, tint = color.primaryText }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; tint?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ width: 48, height: 48, borderRadius: radius.pill, backgroundColor: color.surface, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name={icon} size={22} color={tint} />
    </Pressable>
  );
}
