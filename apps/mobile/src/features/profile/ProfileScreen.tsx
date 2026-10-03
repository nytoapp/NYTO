import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CityText } from "../city/chrome";
import { city, citySpace } from "../city/theme";
import { useSession } from "../auth/useSession";
import { useDiscoveryLocation } from "../location/location-store";
import { interestsById } from "../onboarding/interests";
import { useOnboarding } from "../onboarding/store";

export function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signedIn, signOut } = useSession();
  const interests = useOnboarding((state) => state.interests);
  const chosen = interestsById(interests);
  const cityLabel = useDiscoveryLocation((state) => state.selected?.label) ?? "No city selected";
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
            <CityText size="title">{signedIn ? "Your CITYDAY" : "Guest"}</CityText>
            <CityText tone="muted">{cityLabel}</CityText>
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
          <Row icon="location-outline" label="Location" value={cityLabel} onPress={() => router.push("/")} />
          <Row icon="language-outline" label="Language" value="English" onPress={() => setNote("CITYDAY is in English for now.")} />
          <Row icon="lock-closed-outline" label="Privacy" value="On this device" onPress={() => setNote("Saves and plans stay on this phone until a city database is connected.")} />
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
            <Pressable accessibilityRole="button" accessibilityLabel="Log in" onPress={() => router.push("/sign-in")} style={styles.signOut}>
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
      <Ionicons name={icon} size={18} color={city.ink} />
      <CityText style={styles.rowLabel}>{label}</CityText>
      {value ? (
        <CityText size="meta" tone="muted">
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
  chip: { borderRadius: 999, backgroundColor: city.chip, paddingHorizontal: 12, paddingVertical: 8 },
  edit: { alignSelf: "flex-start", minHeight: 36, justifyContent: "center" },
  row: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: city.line },
  rowLabel: { flex: 1 },
  signOut: { minHeight: 52, justifyContent: "center" },
});
