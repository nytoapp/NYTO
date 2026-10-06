import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CityText } from "../city/chrome";
import { city, citySpace } from "../city/theme";
import { loadAccount } from "../auth/account";
import { useSession } from "../auth/useSession";
import { useDiscoveryLocation } from "../location/location-store";
import { interestsById } from "../onboarding/interests";
import { useOnboarding } from "../onboarding/store";

export function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signedIn, signOut } = useSession();
  const account = useQuery({ queryKey: ["account"], enabled: signedIn, queryFn: loadAccount });
  const interests = useOnboarding((state) => state.interests);
  const chosen = interestsById(interests);
  const cityLabel = useDiscoveryLocation((state) => state.selected?.label) ?? "Choose a city";
  const [notifications, setNotifications] = useState(true);
  const [note, setNote] = useState("");

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={22} color={city.ink} />
          </View>
          <View style={styles.headerCopy}>
            <CityText size="title" numberOfLines={1}>
              {signedIn ? account.data?.displayName ?? "Add your name" : "Guest"}
            </CityText>
            {signedIn && account.data?.phoneE164 ? <CityText tone="muted">{account.data.phoneE164}</CityText> : null}
            {signedIn && account.data?.email ? <CityText tone="muted">{account.data.email}</CityText> : null}
            <CityText tone="muted">{cityLabel}</CityText>
            {signedIn && account.isError ? <CityText size="meta" tone="muted">Couldn't load your account.</CityText> : null}
            {signedIn ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Edit name" onPress={() => router.push({ pathname: "/name", params: { next: "stay" } })}>
                <CityText size="meta" tone="muted">
                  {account.data?.displayName ? "Edit name" : "Add your name"}
                </CityText>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <CityText size="caption" tone="quiet">
            MY INTERESTS
          </CityText>
          <View style={styles.chips}>
            {chosen.length === 0 ? (
              <CityText tone="muted">None yet.</CityText>
            ) : (
              chosen.map((item) => (
                <View key={item.id} style={styles.chip}>
                  <Image source={item.image} style={styles.chipImage} />
                  <CityText size="meta">{item.label}</CityText>
                </View>
              ))
            )}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Edit interests" onPress={() => router.push("/interests")} style={styles.edit}>
            <CityText size="meta" tone="muted">
              Edit interests
            </CityText>
          </Pressable>
        </View>

        <View style={styles.section}>
          <CityText size="caption" tone="quiet">
            PREFERENCES
          </CityText>
          <Row icon="notifications-outline" label="Notifications" value={notifications ? "On" : "Off"} onPress={() => setNotifications((value) => !value)} />
          <Row icon="location-outline" label="Location" value={cityLabel} onPress={() => router.push("/city")} />
          <Row icon="language-outline" label="Language" value="English" onPress={() => setNote("CITYDAY is in English for now.")} />
          <Row icon="lock-closed-outline" label="Privacy" value="On this device" onPress={() => setNote("Saves and plans stay with your CITYDAY account.")} />
        </View>

        <View style={styles.section}>
          <CityText size="caption" tone="quiet">
            MORE
          </CityText>
          <Row icon="calendar-outline" label="Plans" value="" onPress={() => router.push("/(tabs)/trips")} />
          <Row icon="help-circle-outline" label="Help & support" value="" onPress={() => setNote("Write to the CITYDAY team from the account you used to sign in.")} />
          <Row icon="information-circle-outline" label="About CITYDAY" value="" onPress={() => setNote("CITYDAY is a guide to a city: places, evenings, and a short list worth deciding on.")} />
          {note ? (
            <CityText tone="muted" size="meta">
              {note}
            </CityText>
          ) : null}
          {signedIn ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={() => void signOut()} style={styles.signOut}>
              <CityText>Sign out</CityText>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel="Log in" onPress={() => router.push({ pathname: "/sign-in", params: { mode: "login" } })} style={styles.signOut}>
              <CityText>Log in</CityText>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ icon, label, value, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.row}>
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
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: citySpace.page },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: city.chip, alignItems: "center", justifyContent: "center" },
  headerCopy: { gap: 2 },
  section: { marginTop: 28, paddingHorizontal: citySpace.page, gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, backgroundColor: city.chip, paddingLeft: 6, paddingRight: 12, paddingVertical: 6 },
  chipImage: { width: 22, height: 22, borderRadius: 11 },
  edit: { alignSelf: "flex-start", minHeight: 36, justifyContent: "center" },
  row: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: city.line },
  rowLabel: { flex: 1 },
  rowValue: { maxWidth: 140, textAlign: "right" },
  signOut: { minHeight: 52, justifyContent: "center" },
});
