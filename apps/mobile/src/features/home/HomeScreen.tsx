import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { SearchResult } from "@atlas/contracts";
import { CardSkeleton, CategoryCard, DestinationChip, FeaturedPlaceCard, PlaceCard, Rail, SectionHeader } from "../../components/discovery";
import { AppText, Button, Chip, EmptyState, ErrorState, Screen, SearchField, Sheet } from "../../components/ui";
import { useTheme } from "../../components/theme/ThemeProvider";
import { space } from "../../components/theme/tokens";
import { SignInSheet } from "../auth/SignInSheet";
import { useSession } from "../auth/useSession";
import { browseCategories, destinations, isCatalogId } from "../discovery/browse";
import { useDiscoveryLocation } from "../location/location-store";
import { useSearchHandoff } from "../search/handoff";
import { useHome } from "./useHome";

export function HomeScreen() {
  const colors = useTheme();
  const router = useRouter();
  const home = useHome();
  const selected = useDiscoveryLocation((state) => state.selected);
  const setSelected = useDiscoveryLocation((state) => state.setSelected);
  const ask = useSearchHandoff((state) => state.ask);
  const recent = useSearchHandoff((state) => state.recent);
  const { signedIn, refresh, signOut } = useSession();
  const [accountOpen, setAccountOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const rail = home.data?.rails.find((item) => item.items.length > 0) ?? home.data?.rails[0];
  const featured = rail?.items[0];
  const rest = rail?.items.slice(1) ?? [];
  const events = rest.filter((item) => item.kind === "event");
  const nearby = rest.filter((item) => item.kind !== "event");

  function openSearch(next: string) {
    const trimmed = next.trim();
    if (!trimmed) {
      router.push("/search");
      return;
    }
    ask(trimmed);
    router.push("/search");
  }

  function openItem(item: SearchResult) {
    if (isCatalogId(item.id)) {
      router.push(`/subject/${item.id}`);
    }
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.location}>
            <Ionicons name="location" size={16} color={colors.clay} />
            <AppText role="label">{selected?.label ?? home.data?.locationLabel ?? "Choose a city"}</AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={signedIn ? "Account" : "Sign in"}
            onPress={() => setAccountOpen(true)}
            style={[styles.account, { backgroundColor: colors.surface, borderColor: colors.line }]}
          >
            <Ionicons name={signedIn ? "person" : "person-outline"} size={18} color={colors.ink} />
          </Pressable>
        </View>

        <View style={styles.intro}>
          <AppText role="title">Discover the city</AppText>
          <AppText tone="muted">Places, food, stays, and what is on nearby.</AppText>
        </View>

          <SearchField value={draft} onChangeText={setDraft} placeholder="Where do you want to go?" onSubmit={() => openSearch(draft)} />

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

        <View>
          <SectionHeader title="Browse" />
          <Rail>
            {browseCategories.map((category) => (
              <CategoryCard key={category.id} label={category.label} onPress={() => openSearch(category.query)} />
            ))}
          </Rail>
        </View>

        {home.isLoading ? (
          <View>
            <SectionHeader title="Nearby" />
            <CardSkeleton width={320} height={250} />
            <View style={{ height: space[3] }} />
            <Rail>
              <CardSkeleton />
              <CardSkeleton />
            </Rail>
          </View>
        ) : null}

        {home.isError ? (
          <ErrorState title="The catalog is offline" body="Browse still works. Places appear here once the API is reachable." onRetry={() => void home.refetch()} />
        ) : null}

        {home.data && !home.isLoading && !featured ? (
          <EmptyState title="Nothing in this city yet" body="Try another destination, or search for a place, event, or idea." />
        ) : null}

        {featured ? (
          <View style={styles.stack}>
            <SectionHeader title={rail?.title ?? "Featured"} />
            <FeaturedPlaceCard item={featured} onPress={() => openItem(featured)} />
          </View>
        ) : null}

        {events.length > 0 ? (
          <View>
            <SectionHeader title="Events" />
            <Rail>
              {events.map((item) => (
                <PlaceCard key={item.id} item={item} onPress={() => openItem(item)} />
              ))}
            </Rail>
          </View>
        ) : null}

        {nearby.length > 0 ? (
          <View>
            <SectionHeader title="More nearby" />
            <Rail>
              {nearby.map((item) => (
                <PlaceCard key={item.id} item={item} onPress={() => openItem(item)} />
              ))}
            </Rail>
          </View>
        ) : null}

        {recent.length > 0 ? (
          <View>
            <SectionHeader title="Continue exploring" />
            <Rail>
              {recent.map((item) => (
                <Chip key={item} label={item} onPress={() => openSearch(item)} />
              ))}
            </Rail>
          </View>
        ) : null}

        {home.data && home.data.explore.length > 0 ? (
          <View>
            <SectionHeader title="In the catalog" />
            <Rail>
              {home.data.explore.map((category) => (
                <CategoryCard key={category.slug} label={category.label} onPress={() => openSearch(category.label)} />
              ))}
            </Rail>
          </View>
        ) : null}
      </ScrollView>
      <SignInSheet visible={accountOpen && !signedIn} onClose={() => setAccountOpen(false)} onSignedIn={() => void refresh()} />
      <Sheet visible={accountOpen && signedIn} onClose={() => setAccountOpen(false)}>
        <AppText role="title">Signed in</AppText>
        <AppText tone="muted">Saves and trips use this account.</AppText>
        <Button
          label="Sign out"
          variant="secondary"
          onPress={() => {
            void signOut().then(() => setAccountOpen(false));
          }}
        />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: space[5], paddingBottom: space[8] },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: space[2] },
  location: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  account: { width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
  intro: { gap: 4 },
  stack: { gap: 0 },
});
