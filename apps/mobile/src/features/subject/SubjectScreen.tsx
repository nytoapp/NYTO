import { useQuery } from "@tanstack/react-query";
import type { SubjectDetail } from "@atlas/contracts";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ArtPlate } from "../../components/discovery";
import { apiRequest } from "../../api/client";
import { AppText, Attribution, ErrorState, Screen, Skeleton } from "../../components/ui";
import { useTheme } from "../../components/theme/ThemeProvider";
import { space } from "../../components/theme/tokens";

export function SubjectScreen({ id }: { id: string }) {
  const router = useRouter();
  const colors = useTheme();
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
  const back = (
    <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
      <Ionicons name="chevron-back" size={18} color={colors.ink} />
      <AppText role="label">Back</AppText>
    </Pressable>
  );
  if (query.isLoading) {
    return (
      <Screen>
        <View style={styles.page}>
          {back}
          <Skeleton height={220} />
          <Skeleton height={28} />
        </View>
      </Screen>
    );
  }
  if (query.isError || !query.data) {
    return (
      <Screen>
        <View style={styles.page}>
          {back}
          <ErrorState title="This place is unavailable" body="It could not be loaded from the catalog." onRetry={() => void query.refetch()} />
        </View>
      </Screen>
    );
  }
  const place = query.data;
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.page}>
        {back}
        <ArtPlate title={place.title} kind={place.kind} height={220} />
        <AppText role="caption" tone="muted">
          {place.kind}
          {place.countryCode ? ` · ${place.countryCode}` : ""}
        </AppText>
        <AppText role="title">{place.title}</AppText>
        {place.summary ? <AppText tone="muted">{place.summary}</AppText> : null}
        {place.attribution[0] ? <Attribution text={place.attribution[0].text} /> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: space[3], paddingTop: space[3], paddingBottom: space[8] },
  back: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 44, alignSelf: "flex-start" },
});
