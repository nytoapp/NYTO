import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { AppText, Button, Screen } from "../../components/ui";
import { useTheme } from "../../components/theme/ThemeProvider";
import { space } from "../../components/theme/tokens";
import { useSession } from "../auth/useSession";
import { interestsById } from "../onboarding/interests";
import { useOnboarding } from "../onboarding/store";

export function ProfileScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { signedIn, signOut } = useSession();
  const selected = useOnboarding((state) => state.interests);
  const chosen = interestsById(selected);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.page}>
        <AppText role="brand" tone="tertiary">
          CITYDAY
        </AppText>
        <AppText role="title">{signedIn ? "Your account" : "Guest"}</AppText>
        <AppText tone="muted">{signedIn ? "Saves and plans stay on this account." : "Sign in to keep your saves, plans, and interests with you."}</AppText>
        {signedIn ? (
          <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
        ) : (
          <Button label="Log in" onPress={() => router.push("/sign-in")} />
        )}
        <View style={[styles.block, { borderTopColor: colors.divider }]}>
          <AppText role="headline">Interests</AppText>
          <AppText tone="muted">{chosen.length > 0 ? chosen.map((item) => item.label).join(", ") : "None chosen yet."}</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit interests"
            onPress={() => router.push("/interests")}
            style={styles.row}
          >
            <AppText role="label" tone="accent">
              Edit interests
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { gap: space[3], paddingTop: space[4], paddingBottom: space[8] },
  block: { gap: space[2], marginTop: space[6], paddingTop: space[4], borderTopWidth: StyleSheet.hairlineWidth },
  row: { minHeight: 44, justifyContent: "center" },
});
