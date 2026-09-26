import { useState } from "react";
import { FlatList, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText, Attribution, Chip, EmptyState, ErrorState, ListRow, Screen, SearchField } from "../../components/ui";
import { space } from "../../components/theme/tokens";
import { useSearch } from "./useSearch";

export function SearchScreen() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const search = useSearch();
  const data = search.data?.data;
  const warnings = search.data?.meta.warnings ?? [];

  return (
    <Screen>
      <View style={{ gap: space[4], flex: 1 }}>
        <SearchField value={query} onChangeText={setQuery} placeholder={t("searchPlaceholder")} onSubmit={() => search.mutate(query)} />
        {data?.interpretation ? (
          <View style={{ flexDirection: "row", gap: space[2], flexWrap: "wrap" }}>
            {data.interpretation.categorySlugs.map((slug) => (
              <Chip key={slug} label={slug} />
            ))}
            {data.interpretation.preferences.map((item) => (
              <Chip key={item} label={item} />
            ))}
          </View>
        ) : null}
        {warnings.map((warning) => (
          <AppText key={warning.code} tone="muted">{warning.message}</AppText>
        ))}
        {search.isPending ? <AppText tone="muted">Searching…</AppText> : null}
        {search.isError ? (
          <ErrorState title="Search failed" body={search.error instanceof Error ? search.error.message : "Try again."} onRetry={() => search.mutate(query)} />
        ) : null}
        {data && data.results.length === 0 && !search.isPending ? (
          <EmptyState title={t("emptyResults")} body={t("emptyResultsBody")} />
        ) : null}
        <FlatList
          data={data?.results ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ gap: space[1] }}>
              <ListRow title={item.title} meta={item.kind} />
              {item.attribution[0] ? <Attribution text={item.attribution[0].text} /> : null}
            </View>
          )}
        />
      </View>
    </Screen>
  );
}
