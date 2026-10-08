import { ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CityText, IconButton } from "../city/chrome";
import { city, cityRadius, citySpace } from "../city/theme";
import { LanguageChoices } from "../i18n/LanguageChoices";
import { leave } from "../nav/leave";

const helpKeys = ["signIn", "name", "saves", "plans", "web"] as const;

export function AccountInfoScreen({ topic }: { topic: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const known = topic === "notifications" || topic === "language" || topic === "privacy" || topic === "help" || topic === "about";
  const title = known ? t(topic === "language" ? "language.title" : `info.${topic}.title`) : "CITYDAY";

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32, paddingHorizontal: citySpace.page }} showsVerticalScrollIndicator={false}>
        <IconButton label="Back" icon="chevron-back" onPress={() => leave(router, "/profile")} />
        <CityText size="display" style={styles.title}>
          {title}
        </CityText>
        <View style={styles.stack}>
          {topic === "language" ? (
            <View style={styles.card}>
              <LanguageChoices />
            </View>
          ) : null}
          {topic === "notifications" ? (
            <>
              <Card body={t("info.notifications.a")} />
              <Card body={t("info.notifications.b")} />
            </>
          ) : null}
          {topic === "privacy"
            ? (["a", "b", "c", "d", "e", "f"] as const).map((key) => <Card key={key} body={t(`info.privacy.${key}`)} />)
            : null}
          {topic === "help"
            ? helpKeys.map((key) => <Card key={key} title={t(`info.help.${key}Title`)} body={t(`info.help.${key}Body`)} />)
            : null}
          {topic === "about" ? (
            <>
              <Card body={t("info.about.a")} />
              <Card body={t("info.about.b")} />
              <Card body={t("info.about.c")} />
            </>
          ) : null}
          {!known ? <Card body={t("info.missing")} /> : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Card({ title, body }: { title?: string; body: string }) {
  return (
    <View style={styles.card}>
      {title ? <CityText size="section">{title}</CityText> : null}
      <CityText tone="muted">{body}</CityText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: city.page },
  title: { marginTop: 8 },
  stack: { marginTop: 22, gap: 12 },
  card: {
    backgroundColor: city.paper,
    borderRadius: cityRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: city.line,
    padding: 18,
    gap: 6,
  },
});
