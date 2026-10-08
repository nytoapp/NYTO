import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CityText, DarkButton, QuietButton } from "../city/chrome";
import { city, cityRadius, citySpace, color, font, serif } from "../city/theme";
import { loadAccount, saveInterests } from "../auth/account";
import { saveSignInDraft } from "../auth/sign-in-draft";
import { formatPhone } from "../auth/countries";
import { useSession } from "../auth/useSession";
import { useLanguage } from "../i18n/language-store";
import { useDiscoveryLocation } from "../location/location-store";
import { interestsById } from "../onboarding/interests";
import { useOnboarding } from "../onboarding/store";

export function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const language = useLanguage((state) => state.language);
  const queryClient = useQueryClient();
  const { signedIn, signOut } = useSession();
  const account = useQuery({ queryKey: ["account"], enabled: signedIn, queryFn: loadAccount });
  const localInterests = useOnboarding((state) => state.interests);
  const cityLabel = useDiscoveryLocation((state) => state.selected?.label);
  const uploaded = useRef(false);
  const serverIds = account.data?.interestIds ?? [];
  const shownIds = serverIds.length > 0 ? serverIds : localInterests;
  const chosen = interestsById(shownIds);
  const waiting = signedIn && !account.data && account.isPending;
  const name = account.data?.displayName ?? null;
  const phone = formatPhone(account.data?.phoneE164);
  const email = account.data?.email ?? null;

  useEffect(() => {
    if (!signedIn || !account.data || uploaded.current) return;
    const server = account.data.interestIds;
    const local = useOnboarding.getState().interests;
    if (server.length > 0) {
      uploaded.current = true;
      if (server.join("|") !== local.join("|")) void useOnboarding.getState().setInterests(server);
      return;
    }
    if (local.length === 0) {
      uploaded.current = true;
      return;
    }
    uploaded.current = true;
    void saveInterests(local)
      .then((next) => {
        queryClient.setQueryData(["account"], next);
      })
      .catch(() => {
        uploaded.current = false;
      });
  }, [account.data, queryClient, signedIn]);

  function openInterests() {
    const ids = shownIds;
    void useOnboarding.getState().setInterests(ids).then(() => {
      router.push({ pathname: "/interests", params: { mode: "edit" } });
    });
  }

  function confirmSignOut() {
    Alert.alert(t("profile.signOutTitle"), t("profile.signOutBody"), [
      { text: t("profile.cancel"), style: "cancel" },
      { text: t("profile.signOut"), style: "destructive", onPress: () => void signOut() },
    ]);
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 36 }} showsVerticalScrollIndicator={false}>
        <View style={styles.pad}>
          <CityText size="display">{t("profile.title")}</CityText>
          <CityText tone="muted">{t("profile.subtitle")}</CityText>
        </View>

        <View style={styles.block}>
          {signedIn ? (
            <View style={styles.card}>
              <View style={styles.person}>
                <View style={styles.avatar}>
                  {name ? (
                    <Text allowFontScaling maxFontSizeMultiplier={1.2} style={styles.initials}>
                      {initials(name)}
                    </Text>
                  ) : (
                    <Ionicons name="person" size={26} color={city.onDark} />
                  )}
                </View>
                <View style={styles.personCopy}>
                  <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.name} numberOfLines={2}>
                    {account.isError && !account.data ? t("profile.loadFailed") : waiting ? t("profile.loading") : name ?? t("profile.addName")}
                  </Text>
                  {phone ? (
                    <CityText tone="muted" numberOfLines={1}>
                      {phone}
                    </CityText>
                  ) : null}
                  {email ? (
                    <CityText tone="muted" numberOfLines={1}>
                      {email}
                    </CityText>
                  ) : null}
                </View>
              </View>
              {account.isError ? (
                <Pressable accessibilityRole="button" accessibilityLabel={t("profile.tryAgain")} onPress={() => void account.refetch()} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
                  <CityText style={styles.rowLabel}>{t("profile.tryAgain")}</CityText>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={name ? t("profile.editName") : t("profile.addName")}
                  onPress={() => router.push({ pathname: "/name", params: { next: "stay" } })}
                  style={({ pressed }) => [styles.action, pressed && styles.pressed]}
                >
                  <CityText style={styles.rowLabel}>{name ? t("profile.editName") : t("profile.addName")}</CityText>
                  <Ionicons name="chevron-forward" size={16} color={city.quiet} />
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.guest}>
                <CityText size="title">{t("profile.guest")}</CityText>
                <CityText tone="muted">{t("profile.guestBody")}</CityText>
              </View>
              <View style={styles.guestActions}>
                <DarkButton
                  label={t("profile.login")}
                  onPress={() => {
                    void saveSignInDraft({ mode: "login", countryIso: null, national: "", hinting: false }).then(() => {
                      router.push({ pathname: "/sign-in", params: { mode: "login" } });
                    });
                  }}
                />
                <QuietButton
                  label={t("profile.create")}
                  onPress={() => {
                    void saveSignInDraft({ mode: "create", countryIso: null, national: "", hinting: false }).then(() => {
                      router.push({ pathname: "/sign-in", params: { mode: "create" } });
                    });
                  }}
                />
              </View>
            </View>
          )}
        </View>

        <View style={styles.block}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionCopy}>
              <CityText size="section">{t("profile.interests")}</CityText>
              <CityText size="meta" tone="muted">
                {signedIn ? t("profile.interestsAccount") : t("profile.interestsPhone")}
              </CityText>
            </View>
            {chosen.length > 0 ? (
              <Pressable accessibilityRole="button" accessibilityLabel={t("profile.edit")} onPress={openInterests} style={styles.editHit}>
                <CityText size="meta">{t("profile.edit")}</CityText>
              </Pressable>
            ) : null}
          </View>
          {waiting && chosen.length === 0 ? (
            <CityText tone="muted">{t("profile.interestsLoading")}</CityText>
          ) : chosen.length === 0 ? (
            <View style={styles.empty}>
              <CityText size="section">{t("profile.interestsEmpty")}</CityText>
              <CityText tone="muted">{t("profile.interestsEmptyBody")}</CityText>
              <DarkButton label={t("profile.chooseInterests")} onPress={openInterests} />
            </View>
          ) : (
            <View style={styles.chips}>
              {chosen.map((item) => (
                <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label} onPress={openInterests} style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
                  <Image source={item.image} style={styles.chipImage} />
                  <CityText size="meta">{item.label}</CityText>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.block}>
          <CityText size="section">{t("profile.preferences")}</CityText>
          <View style={styles.card}>
            <Row icon="location-outline" label={t("profile.city")} value={cityLabel ?? t("profile.choose")} onPress={() => router.push("/city")} />
            <Row icon="language-outline" label={t("profile.language")} value={language === "sv" ? t("language.swedish") : t("language.english")} onPress={() => router.push({ pathname: "/info", params: { topic: "language" } })} />
            <Row icon="notifications-outline" label={t("profile.notifications")} value={t("profile.off")} onPress={() => router.push({ pathname: "/info", params: { topic: "notifications" } })} />
            <Row icon="lock-closed-outline" label={t("profile.privacy")} value={t("profile.yourAccount")} last onPress={() => router.push({ pathname: "/info", params: { topic: "privacy" } })} />
          </View>
        </View>

        <View style={styles.block}>
          <CityText size="section">{t("profile.help")}</CityText>
          <View style={styles.card}>
            <Row icon="help-circle-outline" label={t("profile.helpSupport")} value="" onPress={() => router.push({ pathname: "/info", params: { topic: "help" } })} />
            <Row icon="information-circle-outline" label={t("profile.about")} value="" last onPress={() => router.push({ pathname: "/info", params: { topic: "about" } })} />
          </View>
        </View>

        {signedIn ? (
          <View style={styles.block}>
            <Pressable accessibilityRole="button" accessibilityLabel={t("profile.signOut")} onPress={confirmSignOut} style={({ pressed }) => [styles.card, styles.signOut, pressed && styles.pressed]}>
              <CityText style={styles.signOutLabel}>{t("profile.signOut")}</CityText>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${last}`.toLocaleUpperCase();
}

function Row({
  icon,
  label,
  value,
  last,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={value ? `${label}, ${value}` : label} onPress={onPress} style={({ pressed }) => [styles.row, last && styles.rowLast, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={city.ink} />
      <CityText style={styles.rowLabel}>{label}</CityText>
      {value ? (
        <CityText size="meta" tone="muted" numberOfLines={1} style={styles.rowValue}>
          {value}
        </CityText>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={city.quiet} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: city.page },
  pad: { paddingHorizontal: citySpace.page, gap: 8 },
  block: { marginTop: 28, paddingHorizontal: citySpace.page, gap: 12 },
  card: {
    backgroundColor: city.paper,
    borderRadius: cityRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: city.line,
    overflow: "hidden",
  },
  person: { flexDirection: "row", alignItems: "center", gap: 16, padding: 18 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: city.ink, alignItems: "center", justifyContent: "center" },
  initials: { fontFamily: serif, fontSize: 22, lineHeight: 26, color: city.onDark },
  name: { ...font.h1, color: city.ink },
  personCopy: { flex: 1, minWidth: 0, gap: 2 },
  action: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: city.line,
  },
  guest: { paddingHorizontal: 18, paddingTop: 18, gap: 8 },
  guestActions: { padding: 16, gap: 4 },
  sectionHead: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  sectionCopy: { flex: 1, gap: 4 },
  editHit: { minWidth: 44, minHeight: 44, alignItems: "flex-end", justifyContent: "center" },
  empty: {
    backgroundColor: city.paper,
    borderRadius: cityRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: city.line,
    padding: 18,
    gap: 12,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: city.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: city.line,
    paddingLeft: 6,
    paddingRight: 14,
  },
  chipImage: { width: 32, height: 32, borderRadius: 16 },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: city.line,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { flex: 1 },
  rowValue: { maxWidth: 132, textAlign: "right" },
  signOut: { minHeight: 56, alignItems: "center", justifyContent: "center" },
  signOutLabel: { color: color.error },
  pressed: { opacity: 0.92 },
});
