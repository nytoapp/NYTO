import { buildResultFilters, removeFilterPhrase, type ResultFilter, type SearchResult } from "@atlas/contracts";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiRequest } from "../../api/client";
import { SignInSheet } from "../auth/SignInSheet";
import { useSession } from "../auth/useSession";
import { IconButton } from "../city/buttons";
import { EmptyState, GuideFab } from "../city/chrome";
import { CityChip } from "../city/chips";
import { isCatalogId } from "../city/format";
import { CompactPlaceCard, placeCardFromResult } from "../city/place-card";
import { SearchBar } from "../city/search-bar";
import { ListSkeleton } from "../city/skeleton";
import { color, font, fontScaleCap, space } from "../city/theme";
import { friendlyError } from "../../lib/errors";
import { loadSaves, readSaveList } from "../saved/save-list";
import { useSearch } from "./useSearch";

export function ResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string }>();
  const initial = typeof params.q === "string" ? params.q : "";
  const [query, setQuery] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [phrases, setPhrases] = useState<string[]>([]);
  const [sort, setSort] = useState<"Recommended" | "Nearby">("Recommended");
  const [signIn, setSignIn] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const search = useSearch();
  const { signedIn, refresh } = useSession();
  const saves = useQuery({
    queryKey: ["saves"],
    enabled: signedIn,
    queryFn: loadSaves,
  });

  const apiQuery = [query, ...phrases].join(" ").replace(/\s+/g, " ").trim();

  useEffect(() => {
    setQuery(initial);
    setDraft(initial);
    setPhrases([]);
  }, [initial]);

  useEffect(() => {
    if (apiQuery) search.mutate(apiQuery);
  }, [apiQuery, search.mutate]);

  const waiting = search.isPending || (Boolean(apiQuery) && search.status === "idle");
  const payload = search.data?.data;
  const filters = buildResultFilters({
    query: apiQuery,
    intent: payload?.interpretation ?? null,
    sort: sort === "Nearby" ? "nearby" : "recommended",
  });
  const results = useMemo(() => {
    const list = Array.isArray(payload?.results) ? payload.results : [];
    if (sort === "Nearby") {
      return [...list].sort((a, b) => (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) - (b.distanceMeters ?? Number.MAX_SAFE_INTEGER));
    }
    return list;
  }, [payload?.results, sort]);
  const savedIds = new Set(readSaveList(saves.data).map((item) => item.subjectId));
  const notices = Array.isArray(payload?.notices) ? payload.notices : [];

  function applyFilter(filter: ResultFilter) {
    if (filter.key === "recommended" || filter.key === "nearby") {
      setSort(filter.key === "nearby" ? "Nearby" : "Recommended");
      return;
    }
    if (!filter.phrase) return;
    const phrase = filter.phrase;
    if (filter.selected) {
      setPhrases((current) => current.filter((item) => item.toLowerCase() !== phrase.toLowerCase()));
      const next = removeFilterPhrase(query, phrase);
      setQuery(next);
      setDraft(next);
      return;
    }
    setPhrases((current) => (current.some((item) => item.toLowerCase() === phrase.toLowerCase()) ? current : [...current, phrase]));
  }

  async function saveSubject(id: string) {
    if (!isCatalogId(id)) return;
    if (!signedIn) {
      setPendingId(id);
      setSignIn(true);
      return;
    }
    setSaveError(null);
    const response = savedIds.has(id)
      ? await apiRequest<{ removed: boolean }>(`/api/v1/saves/${id}`, { method: "DELETE" })
      : await apiRequest<{ id: string }>("/api/v1/saves", { method: "POST", body: JSON.stringify({ subjectId: id }) });
    if (response.error) {
      setSaveError(response.error.message);
      return;
    }
    void saves.refetch();
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.background }}>
      <StatusBar style="dark" />
      <View style={{ paddingTop: insets.top + space[8], paddingHorizontal: space.page, gap: space[12] }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space[4] }}>
          <IconButton label="Back" icon="chevron-back" onPress={() => router.back()} />
          <View style={{ flex: 1 }}>
            <SearchBar
              value={draft}
              onChangeText={setDraft}
              placeholder="Search"
              accessibilityLabel="Edit search"
              onSubmit={() => {
                const next = draft.trim();
                setDraft(next);
                setQuery(next);
              }}
            />
          </View>
        </View>
        {payload?.locationLabel ? (
          <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.label, { color: color.secondaryText }]}>
            {payload.locationLabel}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space[8] }}>
          {filters.map((filter) => (
            <CityChip
              key={filter.key}
              label={filter.label.replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())}
              variant={filter.group === "ranking" || filter.group === "distance" ? "category" : "filter"}
              selected={filter.selected}
              onPress={() => applyFilter(filter)}
            />
          ))}
        </View>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.page, gap: space[12], paddingBottom: insets.bottom + 150 }}>
        {waiting ? <ListSkeleton /> : null}
        {search.isError ? <EmptyState title="Search didn't finish" body={friendlyError(search.error)} action="Try again" onAction={() => search.mutate(apiQuery)} /> : null}
        {saveError ? (
          <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.bodySmall, { color: color.error }]}>
            {saveError}
          </Text>
        ) : null}
        {notices.map((notice) => (
          <Text key={notice.code} allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.bodySmall, { color: color.secondaryText }]}>
            {notice.message}
          </Text>
        ))}
        {!waiting && !search.isError && apiQuery.length === 0 ? (
          <EmptyState title="Search the city" body="Try a place, a meal, or a kind of evening." action="Edit search" onAction={() => router.push("/search")} />
        ) : null}
        {!waiting && !search.isError && apiQuery.length > 0 && results.length === 0 && !notices.some((notice) => notice.code === "GUIDE_HOLD" || notice.code === "HOURS_UNKNOWN") ? (
          <EmptyState
            title="Nothing matched"
            body={`No published places matched “${query.trim() || apiQuery}”. Change the words, or take a filter off.`}
            action="Edit search"
            onAction={() => router.push("/search")}
          />
        ) : null}
        {!waiting && !search.isError
          ? results.map((item: SearchResult) => (
              <CompactPlaceCard
                key={item.id}
                place={placeCardFromResult(item)}
                saved={savedIds.has(item.id)}
                onSave={isCatalogId(item.id) ? () => void saveSubject(item.id) : undefined}
                onPress={isCatalogId(item.id) ? () => router.push(`/subject/${item.id}`) : undefined}
              />
            ))
          : null}
      </ScrollView>
      <GuideFab from="Results" />
      <SignInSheet
        visible={signIn}
        onClose={() => setSignIn(false)}
        onSignedIn={() => {
          const subjectId = pendingId;
          void refresh().then(async () => {
            if (!subjectId || !isCatalogId(subjectId)) return;
            setSaveError(null);
            const response = await apiRequest<{ id: string }>("/api/v1/saves", { method: "POST", body: JSON.stringify({ subjectId }) });
            if (response.error) {
              setSaveError(response.error.message);
              return;
            }
            void saves.refetch();
          });
        }}
      />
    </View>
  );
}
