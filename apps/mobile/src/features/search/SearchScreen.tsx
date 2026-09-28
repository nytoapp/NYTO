import { useCallback, useMemo, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import type { SearchResult } from "@atlas/contracts";
import { CategoryCard, DestinationChip, Rail, SearchResultCard, SectionHeader } from "../../components/discovery";
import { AppText, Chip, EmptyState, ErrorState, Screen, SearchField, Skeleton } from "../../components/ui";
import { space } from "../../components/theme/tokens";
import { browseCategories, destinations, isCatalogId, popularSearches } from "../discovery/browse";
import { useDiscoveryLocation } from "../location/location-store";
import { useSearchHandoff } from "./handoff";
import { useSearch } from "./useSearch";

export function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [kind, setKind] = useState("all");
  const [sort, setSort] = useState<"suggested" | "name">("suggested");
  const search = useSearch();
  const mutate = search.mutate;
  const selected = useDiscoveryLocation((state) => state.selected);
  const setSelected = useDiscoveryLocation((state) => state.setSelected);
  const recent = useSearchHandoff((state) => state.recent);
  const remember = useSearchHandoff((state) => state.remember);
  const take = useSearchHandoff((state) => state.take);
  const data = search.data?.data;
  const warnings = search.data?.meta.warnings ?? [];

  const run = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      setQuery(trimmed);
      setSubmitted(trimmed);
      setKind("all");
      setSort("suggested");
      if (!trimmed) return;
      remember(trimmed);
      mutate(trimmed);
    },
    [mutate, remember],
  );

  useFocusEffect(
    useCallback(() => {
      const pending = take();
      if (pending) run(pending);
    }, [run, take]),
  );

  const results = useMemo(() => {
    const items = data?.results ?? [];
    const filtered = kind === "all" ? items : items.filter((item) => item.kind === kind);
    if (sort === "name") {
      return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    }
    return filtered;
  }, [data?.results, kind, sort]);

  const kinds = useMemo(() => Array.from(new Set((data?.results ?? []).map((item) => item.kind))), [data?.results]);

  function openItem(item: SearchResult) {
    if (isCatalogId(item.id)) {
      router.push(`/subject/${item.id}`);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.top}>
          <SearchField value={query} onChangeText={setQuery} placeholder="Search places, events, food" onSubmit={() => run(query)} />
        </View>
        {submitted ? (
          <FlatList
            data={results}
            keyExtractor={(item) => `${item.factSource}:${item.id}`}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <View style={styles.headerBlock}>
                <View style={styles.metaRow}>
                  <AppText role="label">{search.isPending ? "Searching" : `${results.length} results`}</AppText>
                  <Pressable accessibilityRole="button" accessibilityLabel="Sort results" onPress={() => setSort((current) => (current === "suggested" ? "name" : "suggested"))}>
                    <AppText role="label" tone="accent">
                      {sort === "suggested" ? "Suggested" : "Name"}
                    </AppText>
                  </Pressable>
                </View>
                {kinds.length > 1 ? (
                  <Rail>
                    <Chip label="All" selected={kind === "all"} onPress={() => setKind("all")} />
                    {kinds.map((item) => (
                      <Chip key={item} label={item} selected={kind === item} onPress={() => setKind(item)} />
                    ))}
                  </Rail>
                ) : null}
                {data?.interpretation ? (
                  <Rail>
                    {data.interpretation.categorySlugs.map((slug) => (
                      <Chip key={slug} label={slug} onPress={() => run(slug)} />
                    ))}
                  </Rail>
                ) : null}
                {warnings.map((warning) => (
                  <AppText key={warning.code} role="caption" tone="muted">
                    {warning.message}
                  </AppText>
                ))}
                {search.isPending ? <Skeleton height={180} /> : null}
                {search.isError ? (
                  <ErrorState title="Search could not finish" body={search.error instanceof Error ? search.error.message : "Try again."} onRetry={() => run(submitted)} />
                ) : null}
              </View>
            }
            ListEmptyComponent={
              !search.isPending && !search.isError && data ? (
                <EmptyState title="Nothing matched" body="Try a city, a kind of place, or a broader idea." />
              ) : null
            }
            renderItem={({ item }) => <SearchResultCard item={item} onPress={() => openItem(item)} />}
            ItemSeparatorComponent={() => <View style={{ height: space[3] }} />}
          />
        ) : (
          <FlatList
            data={[]}
            keyExtractor={() => "idle"}
            renderItem={() => null}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <View style={styles.idle}>
                {recent.length > 0 ? (
                  <View>
                    <SectionHeader title="Recent" />
                    <Rail>
                      {recent.map((item) => (
                        <Chip key={item} label={item} onPress={() => run(item)} />
                      ))}
                    </Rail>
                  </View>
                ) : null}
                <View>
                  <SectionHeader title="Popular" />
                  <Rail>
                    {popularSearches.map((item) => (
                      <Chip key={item} label={item} onPress={() => run(item)} />
                    ))}
                  </Rail>
                </View>
                <View>
                  <SectionHeader title="Categories" />
                  <Rail>
                    {browseCategories.map((category) => (
                      <CategoryCard key={category.id} label={category.label} onPress={() => run(category.query)} />
                    ))}
                  </Rail>
                </View>
                <View>
                  <SectionHeader title="Destinations" />
                  <Rail>
                    {destinations.map((destination) => (
                      <DestinationChip
                        key={destination.label}
                        label={destination.label}
                        selected={destination.location ? selected?.id === destination.location.id : selected === null}
                        onPress={() => setSelected(destination.location)}
                      />
                    ))}
                  </Rail>
                </View>
              </View>
            }
          />
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { paddingTop: space[2], paddingBottom: space[3] },
  list: { paddingBottom: space[8], gap: space[3] },
  headerBlock: { gap: space[3], marginBottom: space[3] },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  idle: { gap: space[5] },
});
