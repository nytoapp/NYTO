import { useState } from "react";
import { FlatList, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText, Chip, EmptyState, ErrorState, ListRow, Screen, SearchField, Skeleton } from "../../components/ui";
import { space } from "../../components/theme/tokens";
import { useHome } from "./useHome";
import { useDiscoveryLocation } from "../location/location-store";

export function HomeScreen() {
  const { t } = useTranslation();
  const home = useHome();
  const selected = useDiscoveryLocation((state) => state.selected);
  const setSelected = useDiscoveryLocation((state) => state.setSelected);
  const [query, setQuery] = useState("");
  const rail = home.data?.rails[0];

  return (
    <Screen>
      <View style={{ gap: space[4], flex: 1 }}>
        <AppText role="caption" tone="muted">{selected ? selected.label : "Choose a city"}</AppText>
        <AppText role="display">{t("homeGreeting")}</AppText>
        <SearchField value={query} onChangeText={setQuery} placeholder={t("searchPlaceholder")} />
        <View style={{ flexDirection: "row", gap: space[2], flexWrap: "wrap" }}>
          <Chip
            label="Paris"
            selected={selected?.label === "Paris"}
            onPress={() => setSelected({ id: "018f5c3a-7c3a-7000-8000-0000000000a1", label: "Paris", countryCode: "FR", timezone: "Europe/Paris" })}
          />
          <Chip
            label="Bengaluru"
            selected={selected?.label === "Bengaluru"}
            onPress={() => setSelected({ id: "018f5c3a-7c3a-7000-8000-0000000000a3", label: "Bengaluru", countryCode: "IN", timezone: "Asia/Kolkata" })}
          />
        </View>
        {home.isLoading ? <Skeleton /> : null}
        {home.isError ? <ErrorState title="Home is unavailable" body="Check that the API is running, then try again." onRetry={() => void home.refetch()} /> : null}
        {rail && rail.items.length === 0 ? <EmptyState title="Nothing nearby yet" body="Seed the fixture catalog or pick another city." /> : null}
        {rail ? (
          <FlatList
            data={rail.items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ListRow title={item.title} meta={item.kind} />}
          />
        ) : null}
      </View>
    </Screen>
  );
}
