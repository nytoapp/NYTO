import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiRequest } from "../../api/client";
import { CityText, EmptyState } from "../city/chrome";
import { ListSkeleton } from "../city/skeleton";
import { city, cityRadius, citySpace, serif } from "../city/theme";
import { useSession } from "../auth/useSession";
import { useDiscoveryLocation } from "../location/location-store";
import { partLabel, placeCount } from "../i18n/labels";
import { civilDateInZone, civilParts, dayParts, loadTrips, readTripList, stopsForPart, type TripRow } from "./trip-list";

export function TripsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signedIn, restoring } = useSession();
  const selected = useDiscoveryLocation((state) => state.selected);
  const [createError, setCreateError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const trips = useQuery({
    queryKey: ["trips"],
    enabled: signedIn,
    queryFn: loadTrips,
  });
  const plans = readTripList(trips.data);
  const exploreLabel = selected ? t("plans.exploreCity", { city: selected.label }) : t("plans.chooseCity");
  const todayPlan = selected ? plans.find((trip) => trip.status === "current" && trip.destinationLabel === selected.label) : undefined;
  const startLabel = !selected ? t("plans.chooseCity") : todayPlan ? t("plans.openToday") : t("plans.startToday", { city: selected.label });
  const loading = restoring || (signedIn && (trips.isLoading || (!trips.isSuccess && !trips.isError)));
  const failed = signedIn && trips.isError;
  const empty = signedIn && trips.isSuccess && plans.length === 0 && !loading;
  const loaded = signedIn && trips.isSuccess && plans.length > 0 && !loading && !failed;
  const comingDays = comingDaySlots(plans, selected?.timezone, selected?.label);

  async function openDay(iso: string) {
    if (!selected) {
      router.push("/city");
      return;
    }
    if (opening) return;
    const existing = plans.find((trip) => trip.startsOn.startsWith(iso) && trip.destinationLabel === selected.label);
    if (existing) {
      router.push(`/trip/${existing.id}`);
      return;
    }
    setOpening(iso);
    setCreateError(null);
    const response = await apiRequest<{ id: string }>("/api/v1/trips", {
      method: "POST",
      body: JSON.stringify({ destinationLocationId: selected.id, startsOn: iso, endsOn: iso, title: `A day in ${selected.label}` }),
    });
    setOpening(null);
    if (response.error || !response.data?.id) {
      setCreateError(response.error?.message ?? t("plans.couldNotStart"));
      return;
    }
    await trips.refetch();
    router.push(`/trip/${response.data.id}`);
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.pad}>
          <CityText size="display">{t("plans.title")}</CityText>
          <CityText tone="muted">{t("plans.subtitle")}</CityText>
        </View>
        {!restoring && !signedIn ? (
          <EmptyState
            title={t("plans.guestTitle")}
            body={t("plans.guestBody")}
            action={t("signIn.login")}
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
          <EmptyState title={t("plans.loadFailed")} body={t("plans.loadFailedBody")} action={t("common.tryAgain")} onAction={() => void trips.refetch()} />
        ) : null}
        {empty ? <EmptyState title={t("plans.empty")} body={t("plans.emptyBody")} action={startLabel} onAction={() => void openDay(selected ? civilDateInZone(selected.timezone, 0) : "")} /> : null}
        {loaded ? (
          <>
            <DayGroup title={t("plans.today")} trips={plans.filter((trip) => trip.status === "current")} onOpen={(id) => router.push(`/trip/${id}`)} />
            <DayGroup title={t("plans.comingUp")} trips={plans.filter((trip) => trip.status === "upcoming" && trip.itemCount > 0)} onOpen={(id) => router.push(`/trip/${id}`)} />
            <DayGroup title={t("plans.earlier")} trips={plans.filter((trip) => trip.status === "past" && trip.itemCount > 0)} onOpen={(id) => router.push(`/trip/${id}`)} />
          </>
        ) : null}
        {signedIn && selected && !loading && !failed && comingDays.length > 0 ? (
          <View style={styles.later}>
            <CityText size="section">{t("plans.comingDays")}</CityText>
            <CityText tone="muted">{t("plans.comingHint")}</CityText>
            {comingDays.map((day) => {
              const date = civilParts(day.iso);
              return (
                <Pressable
                  key={day.iso}
                  accessibilityRole="button"
                  accessibilityLabel={`${date.weekday} ${date.day} ${date.month}`}
                  disabled={opening !== null}
                  onPress={() => (day.tripId ? router.push(`/trip/${day.tripId}`) : void openDay(day.iso))}
                  style={styles.laterRow}
                >
                  <Text allowFontScaling maxFontSizeMultiplier={1.2} style={styles.laterDay}>
                    {date.day}
                  </Text>
                  <View style={styles.laterCopy}>
                    <CityText size="section">{date.weekday}</CityText>
                    <CityText size="meta" tone="muted">
                      {date.month}
                      {opening === day.iso ? ` · ${t("plans.starting")}` : ""}
                    </CityText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={city.quiet} />
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {createError ? (
          <View style={styles.pad}>
            <CityText tone="muted">{createError}</CityText>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function comingDaySlots(plans: TripRow[], timezone: string | undefined, label: string | undefined): { iso: string; tripId?: string }[] {
  if (!timezone || !label) return [];
  const slots = new Map<string, string | undefined>();
  for (let offset = 1; offset <= 6; offset += 1) slots.set(civilDateInZone(timezone, offset), undefined);
  for (const trip of plans) {
    if (trip.destinationLabel !== label || trip.status !== "upcoming") continue;
    const iso = trip.startsOn.slice(0, 10);
    if (trip.itemCount > 0) slots.delete(iso);
    else slots.set(iso, trip.id);
  }
  return [...slots.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([iso, tripId]) => ({ iso, tripId }));
}

function DayGroup({ title, trips, onOpen }: { title: string; trips: TripRow[]; onOpen: (id: string) => void }) {
  if (trips.length === 0) return null;
  return (
    <View>
      <View style={styles.pad}>
        <CityText size="section">{title}</CityText>
      </View>
      {trips.map((trip) =>
        trip.itemCount > 0 ? <DayCard key={trip.id} trip={trip} onPress={() => onOpen(trip.id)} /> : <QuietDay key={trip.id} trip={trip} onPress={() => onOpen(trip.id)} />,
      )}
    </View>
  );
}

function DayCard({ trip, onPress }: { trip: TripRow; onPress: () => void }) {
  const { t } = useTranslation();
  const date = civilParts(trip.startsOn);
  const count = trip.itemCount;
  const filled = dayParts
    .map((part) => ({ part, names: stopsForPart(trip.stops, part.id) }))
    .filter((entry) => entry.names.length > 0);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${trip.destinationLabel}, ${date.weekday} ${date.day} ${date.month}`} onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.cardHead}>
        <View style={styles.lockup}>
          <Text allowFontScaling maxFontSizeMultiplier={1.2} style={styles.dayNumber}>
            {date.day}
          </Text>
          <View style={styles.lockupCopy}>
            <CityText size="meta">{date.weekday}</CityText>
            <CityText size="meta" tone="muted">
              {date.month}
            </CityText>
          </View>
        </View>
        <View style={styles.cardMeta}>
          <CityText size="meta">{trip.destinationLabel}</CityText>
          <CityText size="meta" tone="quiet">
            {placeCount(count, t)}
          </CityText>
        </View>
      </View>
      <View style={styles.rule} />
      <View style={styles.parts}>
        {filled.map(({ part, names }) => {
          const shown = names.slice(0, 3);
          const rest = names.length - shown.length;
          return (
            <View key={part.id} style={styles.part}>
              <CityText size="meta" tone="quiet">
                {partLabel(part.id, t)}
              </CityText>
              {shown.map((name, index) => (
                <CityText key={`${part.id}-${index}`} numberOfLines={1}>
                  {name}
                </CityText>
              ))}
              {rest > 0 ? (
                <CityText size="meta" tone="quiet">
                  {t("plans.more", { count: rest })}
                </CityText>
              ) : null}
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}

function QuietDay({ trip, onPress }: { trip: TripRow; onPress: () => void }) {
  const { t } = useTranslation();
  const date = civilParts(trip.startsOn);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${trip.destinationLabel}, ${date.weekday} ${date.day} ${date.month}`} onPress={onPress} style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}>
      <Text allowFontScaling maxFontSizeMultiplier={1.2} style={styles.quietDay}>
        {date.day}
      </Text>
      <View style={styles.laterCopy}>
        <CityText size="section">{date.weekday}</CityText>
        <CityText size="meta" tone="muted">
          {date.month} · {trip.destinationLabel}
        </CityText>
      </View>
      <CityText size="meta" tone="quiet">
        {t("plans.addPlaces")}
      </CityText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: city.page },
  pad: { paddingHorizontal: citySpace.page, gap: 8, marginBottom: 16 },
  card: {
    marginHorizontal: citySpace.page,
    marginBottom: 14,
    backgroundColor: city.paper,
    borderRadius: cityRadius.card,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: city.line,
  },
  pressed: { opacity: 0.92 },
  cardHead: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  lockup: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  dayNumber: { fontFamily: serif, fontSize: 40, lineHeight: 44, color: city.ink, fontWeight: "500" },
  lockupCopy: { paddingBottom: 4 },
  cardMeta: { alignItems: "flex-end", paddingBottom: 4, gap: 2 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: city.line, marginVertical: 14 },
  parts: { gap: 14 },
  part: { gap: 2 },
  quiet: {
    marginHorizontal: citySpace.page,
    marginBottom: 14,
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: city.paper,
    borderRadius: cityRadius.card,
    paddingHorizontal: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: city.line,
  },
  quietDay: { width: 36, fontFamily: serif, fontSize: 28, lineHeight: 32, color: city.ink },
  later: { paddingHorizontal: citySpace.page, gap: 4, marginTop: 8 },
  laterRow: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: city.line },
  laterDay: { width: 36, fontFamily: serif, fontSize: 22, lineHeight: 26, color: city.ink },
  laterCopy: { flex: 1, gap: 1 },
});
