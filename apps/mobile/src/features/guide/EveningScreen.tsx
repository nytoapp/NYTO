import type { SearchResult, TripDetail } from "@atlas/contracts";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest } from "../../api/client";
import { useSession } from "../auth/useSession";
import { CityText, DarkButton } from "../city/chrome";
import { categoryArt } from "../city/category-art";
import { isCatalogId } from "../city/format";
import { CompactPlaceCard, placeCardFromResult } from "../city/place-card";
import { city, citySpace } from "../city/theme";
import { useDiscoveryLocation } from "../location/location-store";
import { useSearch } from "../search/useSearch";

const moods = [
  { id: "food", label: "Food", icon: "restaurant-outline" as const },
  { id: "music", label: "Music", icon: "musical-notes-outline" as const },
  { id: "drinks", label: "Drinks", icon: "wine-outline" as const },
  { id: "culture", label: "Culture", icon: "color-palette-outline" as const },
  { id: "social", label: "Social", icon: "people-outline" as const },
  { id: "surprise", label: "Surprise me", icon: "sparkles-outline" as const },
];
const whens = ["Tonight", "This weekend"];
const company = ["Myself", "Partner", "Friends", "Family"];

const moodQuery: Record<string, string> = {
  food: "restaurants",
  drinks: "nightlife",
  culture: "museums",
  music: "concerts",
  social: "nightlife",
  surprise: "things to do",
};

const orderNotes = ["First", "Then", "Later"];
const slots = ["dinner", "night", "unscheduled"] as const;

type EveningPlan = { mood: string; when: string; withWhom: string; query: string };

export function EveningScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tile = Math.floor((width - citySpace.page * 2 - 20) / 3);
  const [mood, setMood] = useState("food");
  const [when, setWhen] = useState("Tonight");
  const [withWhom, setWithWhom] = useState("Myself");
  const [plan, setPlan] = useState<EveningPlan | null>(null);
  const search = useSearch();
  const { signedIn } = useSession();
  const selected = useDiscoveryLocation((state) => state.selected);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function show() {
    const query = moodQuery[mood] ?? "things to do";
    setPlan({ mood, when, withWhom, query });
    setSaveError(null);
    search.mutate(query);
  }

  async function saveEvening(places: SearchResult[]) {
    if (!signedIn) {
      router.push("/sign-in");
      return;
    }
    if (!selected || !plan) {
      router.push("/city");
      return;
    }
    const picks = places.filter((place) => isCatalogId(place.id)).slice(0, 3);
    if (picks.length === 0) return;
    setSaving(true);
    setSaveError(null);
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: selected.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const moodLabel = moods.find((item) => item.id === plan.mood)?.label ?? "Evening";
    const created = await apiRequest<{ id: string }>("/api/v1/trips", {
      method: "POST",
      body: JSON.stringify({
        destinationLocationId: selected.id,
        startsOn: day,
        endsOn: day,
        title: `${moodLabel} in ${selected.label}`,
      }),
    });
    if (created.error || !created.data?.id) {
      setSaveError(created.error?.message ?? "The evening could not be saved.");
      setSaving(false);
      return;
    }
    const detail = await apiRequest<TripDetail>(`/api/v1/trips/${created.data.id}`);
    const tripDayId = detail.data?.days[0]?.id ?? null;
    for (let index = 0; index < picks.length; index += 1) {
      const added = await apiRequest<{ id: string }>(`/api/v1/trips/${created.data.id}/items`, {
        method: "POST",
        body: JSON.stringify({
          subjectId: picks[index].id,
          slot: slots[index] ?? "unscheduled",
          tripDayId,
          notes: orderNotes[index] ?? null,
        }),
      });
      if (added.error) {
        setSaveError(added.error.message);
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    router.push(`/trip/${created.data.id}`);
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 28, paddingHorizontal: citySpace.page }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={city.ink} />
        </Pressable>
        <CityText size="display">Build my evening</CityText>
        <CityText size="section" style={styles.ask}>
          What are you feeling?
        </CityText>
        <View style={styles.grid}>
          {moods.map((item) => {
            const on = mood === item.id;
            return (
              <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={item.label} onPress={() => setMood(item.id)} style={[styles.mood, { width: tile, height: tile }, on && styles.on]}>
                <Image source={categoryArt(item.label)} resizeMode="cover" style={StyleSheet.absoluteFill} />
                <View style={styles.moodShade}>
                  <CityText size="meta" tone="onDark">
                    {item.label}
                  </CityText>
                </View>
              </Pressable>
            );
          })}
        </View>
        <CityText size="section" style={styles.ask}>
          When?
        </CityText>
        <View style={styles.row}>
          {whens.map((item) => (
            <Choice key={item} label={item} on={when === item} onPress={() => setWhen(item)} />
          ))}
        </View>
        <CityText size="section" style={styles.ask}>
          With?
        </CityText>
        <View style={styles.row}>
          {company.map((item) => (
            <Choice key={item} label={item} on={withWhom === item} onPress={() => setWithWhom(item)} />
          ))}
        </View>
        <View style={styles.cta}>
          <DarkButton label={search.isPending ? "Finding places" : "Show me"} disabled={search.isPending} onPress={show} />
        </View>
        {plan ? (
          <PlanResult
            plan={plan}
            pending={search.isPending}
            failed={search.isError}
            signedIn={signedIn}
            results={Array.isArray(search.data?.data?.results) ? search.data.data.results : []}
            city={selected?.label ?? search.data?.data?.locationLabel ?? "this city"}
            saving={saving}
            saveError={saveError}
            onOpen={(id) => router.push(`/subject/${id}`)}
            onRetry={() => search.mutate(plan.query)}
            onSave={(places) => void saveEvening(places)}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

function PlanResult({
  plan,
  pending,
  failed,
  signedIn,
  results,
  city,
  saving,
  saveError,
  onOpen,
  onRetry,
  onSave,
}: {
  plan: EveningPlan;
  pending: boolean;
  failed: boolean;
  signedIn: boolean;
  results: SearchResult[];
  city: string;
  saving: boolean;
  saveError: string | null;
  onOpen: (id: string) => void;
  onRetry: () => void;
  onSave: (places: SearchResult[]) => void;
}) {
  const moodLabel = moods.find((item) => item.id === plan.mood)?.label ?? "Evening";
  const picks = results.filter((place) => isCatalogId(place.id)).slice(0, 3);
  return (
    <View style={styles.result}>
      <CityText size="caption" tone="quiet">
        {`${moodLabel} · ${plan.when} · ${plan.withWhom}`.toUpperCase()}
      </CityText>
      {pending ? <CityText tone="muted">Finding places in {city}.</CityText> : null}
      {failed ? (
        <>
          <CityText>Those places didn't load.</CityText>
          <DarkButton label="Try again" onPress={onRetry} />
        </>
      ) : null}
      {!pending && !failed && picks.length === 0 ? <CityText tone="muted">Nothing published matches {plan.query} in {city} yet.</CityText> : null}
      {!pending && !failed && picks.length > 0 ? (
        <>
          <CityText tone="muted">An order from places already in {city}. Opening hours are not in CITYDAY, so nothing here is booked.</CityText>
          {picks.map((place, index) => (
            <View key={place.id} style={{ gap: 6 }}>
              <CityText size="caption" tone="quiet">
                {(orderNotes[index] ?? "Later").toUpperCase()}
              </CityText>
              <CompactPlaceCard place={placeCardFromResult(place)} onPress={() => onOpen(place.id)} />
            </View>
          ))}
          <DarkButton label={saving ? "Saving" : signedIn ? "Save this evening" : "Sign in to save this evening"} disabled={saving} onPress={() => onSave(picks)} />
        </>
      ) : null}
      {saveError ? <CityText tone="muted">{saveError}</CityText> : null}
    </View>
  );
}

function Choice({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={label} onPress={onPress} style={[styles.choice, on && styles.on]}>
      <CityText size="meta" tone={on ? "onDark" : "ink"}>
        {label}
      </CityText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: city.page },
  back: { width: 44, height: 44, justifyContent: "center" },
  ask: { marginTop: 28, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  mood: { borderRadius: 16, overflow: "hidden", borderWidth: 2, borderColor: "transparent" },
  moodShade: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 8, paddingVertical: 8, backgroundColor: "rgba(28,25,23,0.45)" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { borderRadius: 999, backgroundColor: city.chip, paddingHorizontal: 16, paddingVertical: 10 },
  on: { backgroundColor: city.ink, borderColor: city.ink },
  cta: { marginTop: 32 },
  result: { marginTop: 28, gap: 12 },
});
