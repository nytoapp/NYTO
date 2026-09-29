import { useState } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { DestinationResolveResponse, SubjectDetail } from "@atlas/contracts";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { kindLabel } from "../../components/discovery";
import { apiRequest } from "../../api/client";
import { AppText, Attribution, Button, ErrorState, Screen, Skeleton } from "../../components/ui";
import { useTheme } from "../../components/theme/ThemeProvider";
import { space } from "../../components/theme/tokens";
import { friendlyError } from "../../lib/errors";
import { SignInSheet } from "../auth/SignInSheet";
import { useSession } from "../auth/useSession";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function actionLabel(place: SubjectDetail): string | null {
  if (!place.booking?.destinationId || place.booking.capability === "unavailable") {
    return null;
  }
  return place.booking.label;
}

export function SubjectScreen({ id }: { id: string }) {
  const router = useRouter();
  const colors = useTheme();
  const { signedIn, refresh } = useSession();
  const [signIn, setSignIn] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
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
      if (response.error || !response.data) {
        return { items: [] };
      }
      return response.data;
    },
  });
  const save = useMutation({
    mutationFn: async () => {
      const response = await apiRequest<{ id: string }>("/api/v1/saves", {
        method: "POST",
        body: JSON.stringify({ subjectId: id }),
      });
      if (response.error || !response.data) {
        throw new Error(response.error?.message ?? "Couldn't save this place.");
      }
      return response.data;
    },
    onSuccess: () => {
      void saved.refetch();
    },
  });
  const openDestination = useMutation({
    mutationFn: async (destinationId: string) => {
      const response = await apiRequest<DestinationResolveResponse>("/api/v1/destinations/resolve", {
        method: "POST",
        body: JSON.stringify({ destinationId }),
      });
      if (response.error || !response.data) {
        throw new Error(response.error?.message ?? "That link is not available.");
      }
      await Linking.openURL(response.data.preferredUrl);
    },
    onError: (error) => setActionError(friendlyError(error, "That link is not available.")),
  });
  const alreadySaved = saved.data?.items.some((item) => item.subjectId === id) ?? false;
  const back = (
    <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.surface }]}>
      <Ionicons name="chevron-back" size={18} color={colors.ink} />
    </Pressable>
  );
  if (query.isLoading) {
    return (
      <Screen>
        <View style={styles.page}>
          {back}
          <Skeleton height={280} />
          <Skeleton height={28} width="70%" />
          <Skeleton height={16} width="40%" />
        </View>
      </Screen>
    );
  }
  if (query.isError || !query.data) {
    return (
      <Screen>
        <View style={styles.page}>
          {back}
          <ErrorState title="This place did not load." body="Give it another try." onRetry={() => void query.refetch()} />
        </View>
      </Screen>
    );
  }
  const place = query.data;
  const hero = place.images?.[0]?.url;
  const label = actionLabel(place);
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={[styles.hero, { backgroundColor: colors.elevatedSurface }]}>
          {hero && !imageFailed ? (
            <Image accessibilityLabel={place.images?.[0]?.alt ?? place.title} source={{ uri: hero }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setImageFailed(true)} />
          ) : null}
          <View style={styles.scrim} />
          <View style={styles.heroBar}>{back}</View>
        </View>
        <AppText role="caption" tone="muted">
          {[place.category ?? kindLabel(place.kind), place.locality, place.countryCode].filter(Boolean).join(" · ")}
        </AppText>
        <AppText role="title">{place.title}</AppText>
        {place.summary ? <AppText tone="muted">{place.summary}</AppText> : null}
        {place.rating !== null || place.price ? (
          <AppText role="caption" tone="muted">
            {[
              place.rating !== null ? place.rating.toFixed(1) : null,
              place.price
                ? `${place.price.currency} ${place.price.currency === "JPY" || place.price.currency === "KRW" || place.price.currency === "VND" ? place.price.amountMinor : (place.price.amountMinor / 100).toFixed(0)}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </AppText>
        ) : null}
        {(place.tags?.length ?? 0) > 0 ? (
          <AppText role="caption" tone="muted">
            {place.tags.join(" · ")}
          </AppText>
        ) : null}
        {(place.hours?.length ?? 0) > 0 ? (
          <View style={styles.block}>
            <AppText role="headline">Hours</AppText>
            {place.hours.map((hour) => (
              <AppText key={`${hour.weekday}-${hour.opens}`} role="caption" tone="muted">
                {weekdays[hour.weekday] ?? "Day"} · {hour.opens}–{hour.closes}
              </AppText>
            ))}
          </View>
        ) : null}
        {place.startsAt ? (
          <AppText role="caption" tone="muted">
            {new Date(place.startsAt).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </AppText>
        ) : null}
        {place.phone ? <AppText role="caption" tone="muted">{place.phone}</AppText> : null}
        {place.attribution[0] ? <Attribution text={place.attribution[0].text} /> : null}
        <Button
          label={alreadySaved ? "Saved" : save.isPending ? "Saving" : "Save"}
          variant={alreadySaved ? "secondary" : "primary"}
          disabled={save.isPending || alreadySaved}
          onPress={() => {
            if (!signedIn) {
              setSignIn(true);
              return;
            }
            save.mutate();
          }}
        />
        {label && place.booking?.destinationId ? (
          <Button
            label={openDestination.isPending ? "Opening" : label}
            variant="secondary"
            disabled={openDestination.isPending}
            onPress={() => {
              setActionError(null);
              openDestination.mutate(place.booking.destinationId as string);
            }}
          />
        ) : null}
        {actionError ? <AppText role="caption" tone="muted">{actionError}</AppText> : null}
        {save.isError ? <AppText role="caption" tone="muted">{friendlyError(save.error, "Couldn't save this place.")}</AppText> : null}
      </ScrollView>
      <SignInSheet visible={signIn} onClose={() => setSignIn(false)} onSignedIn={() => void refresh()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: space[3], paddingTop: space[3], paddingBottom: space[8] },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  hero: { height: 280, borderRadius: 24, overflow: "hidden" },
  scrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: 80, backgroundColor: "rgba(8, 9, 11, 0.35)" },
  heroBar: { position: "absolute", top: space[3], left: space[3] },
  block: { gap: 4 },
});
