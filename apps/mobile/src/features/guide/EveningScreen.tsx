import type { SearchResult, TripDetail } from "@atlas/contracts";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { leave } from "../nav/leave";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest } from "../../api/client";
import { useSession } from "../auth/useSession";
import { CityText, DarkButton } from "../city/chrome";
import { categoryArt } from "../city/category-art";
import { catalogName } from "../i18n/labels";
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
const orderKeys = ["evening.first", "evening.then", "evening.later"] as const;
const moodKey: Record<string, string> = {
  food: "interests.food",
  music: "interests.music",
  drinks: "evening.drinks",
  culture: "interests.culture",
  social: "evening.social",
  surprise: "interests.surprise",
};
const whenKey: Record<string, string> = { Tonight: "evening.tonight", "This weekend": "evening.weekend" };
const companyKey: Record<string, string> = { Myself: "evening.myself", Partner: "evening.partner", Friends: "evening.friends", Family: "evening.family" };

function named(table: Record<string, string>, value: string, t: TFunction): string {
  const key = table[value];
  return key ? t(key) : value;
}
const slots = ["dinner", "night", "unscheduled"] as const;

type EveningPlan = { mood: string; when: string; withWhom: string; query: string };

export function EveningScreen() {
  const { t } = useTranslation();
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
      router.push({ pathname: "/sign-in", params: { mode: "login" } });
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
      setSaveError(created.error?.message ?? t("evening.saveFailed"));
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
        <Pressable accessibilityRole="button" accessibilityLabel={t("common.back")} onPress={() => leave(router, "/")} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={city.ink} />
        </Pressable>
        <CityText size="display">{t("evening.title")}</CityText>
        <CityText size="section" style={styles.ask}>
          {t("evening.feeling")}
        </CityText>
        <View style={styles.grid}>
          {moods.map((item) => {
            const on = mood === item.id;
            return (
              <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={named(moodKey, item.id, t)} onPress={() => setMood(item.id)} style={[styles.mood, { width: tile, height: tile }, on && styles.on]}>
                <Image source={categoryArt(item.label)} resizeMode="cover" style={StyleSheet.absoluteFill} />
                <View style={styles.moodShade}>
                  <CityText size="meta" tone="onDark">
                    {named(moodKey, item.id, t)}
                  </CityText>
                </View>
              </Pressable>
            );
          })}
        </View>
        <CityText size="section" style={styles.ask}>
          {t("evening.when")}
        </CityText>
        <View style={styles.row}>
          {whens.map((item) => (
            <Choice key={item} label={named(whenKey, item, t)} on={when === item} onPress={() => setWhen(item)} />
          ))}
        </View>
        <CityText size="section" style={styles.ask}>
          {t("evening.with")}
        </CityText>
        <View style={styles.row}>
          {company.map((item) => (
            <Choice key={item} label={named(companyKey, item, t)} on={withWhom === item} onPress={() => setWithWhom(item)} />
          ))}
        </View>
        <View style={styles.cta}>
          <DarkButton label={search.isPending ? t("evening.finding") : t("evening.show")} disabled={search.isPending} onPress={show} />
        </View>
        {plan ? (
          <PlanResult
            plan={plan}
            pending={search.isPending}
            failed={search.isError}
            signedIn={signedIn}
            results={Array.isArray(search.data?.data?.results) ? search.data.data.results : []}
            city={selected?.label ?? search.data?.data?.locationLabel ?? t("evening.thisCity")}
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
  const { t } = useTranslation();
  const moodLabel = named(moodKey, plan.mood, t);
  const picks = results.filter((place) => isCatalogId(place.id)).slice(0, 3);
  return (
    <View style={styles.result}>
      <CityText size="caption" tone="quiet">
        {`${moodLabel} · ${named(whenKey, plan.when, t)} · ${named(companyKey, plan.withWhom, t)}`.toLocaleUpperCase()}
      </CityText>
      {pending ? <CityText tone="muted">{t("evening.findingIn", { city })}</CityText> : null}
      {failed ? (
        <>
          <CityText>{t("evening.failed")}</CityText>
          <DarkButton label={t("common.tryAgain")} onPress={onRetry} />
        </>
      ) : null}
      {!pending && !failed && picks.length === 0 ? <CityText tone="muted">{t("evening.none", { query: catalogName(plan.query, t), city })}</CityText> : null}
      {!pending && !failed && picks.length > 0 ? (
        <>
          <CityText tone="muted">{t("evening.order", { city })}</CityText>
          {picks.map((place, index) => (
            <View key={place.id} style={{ gap: 6 }}>
              <CityText size="caption" tone="quiet">
                {t(orderKeys[index] ?? "evening.later").toLocaleUpperCase()}
              </CityText>
              <CompactPlaceCard place={placeCardFromResult(place)} onPress={() => onOpen(place.id)} />
            </View>
          ))}
          <DarkButton label={saving ? t("evening.saving") : signedIn ? t("evening.save") : t("evening.login")} disabled={saving} onPress={() => onSave(picks)} />
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
