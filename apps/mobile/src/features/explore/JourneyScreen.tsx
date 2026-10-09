import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { leave } from "../nav/leave";
import { Pressable, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CityText, DarkButton, QuietButton } from "../city/chrome";
import { city, cityRadius, citySpace } from "../city/theme";
import { useDiscoveryLocation } from "../location/location-store";

export function JourneyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const label = useDiscoveryLocation((state) => state.selected?.label) ?? t("journey.city");

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <StatusBar style="dark" />
      <View style={styles.body}>
        <CityText size="display">{t("journey.new", { city: label })}</CityText>
        <CityText tone="muted">{t("journey.body")}</CityText>
        <Pressable accessibilityRole="button" accessibilityLabel={t("journey.things")} onPress={() => router.replace({ pathname: "/results", params: { q: "things to do" } })} style={styles.option}>
          <CityText size="section">{t("journey.things")}</CityText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t("journey.food")} onPress={() => router.replace({ pathname: "/results", params: { q: "food" } })} style={styles.option}>
          <CityText size="section">{t("journey.food")}</CityText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t("explore.neighborhood")} onPress={() => router.replace("/search")} style={styles.option}>
          <CityText size="section">{t("explore.neighborhood")}</CityText>
        </Pressable>
        <View style={styles.flex} />
        <DarkButton label={t("journey.start")} onPress={() => router.replace("/explore")} />
        <QuietButton label={t("journey.later")} onPress={() => leave(router, "/")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: city.page, paddingHorizontal: citySpace.page },
  body: { flex: 1, gap: 12 },
  option: { minHeight: 56, borderRadius: cityRadius.card, backgroundColor: city.paper, borderWidth: StyleSheet.hairlineWidth, borderColor: city.line, justifyContent: "center", paddingHorizontal: 16 },
  flex: { flex: 1 },
});
