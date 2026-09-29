import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText, Button } from "../components/ui";
import { useTheme } from "../components/theme/ThemeProvider";
import { space } from "../components/theme/tokens";
import { useOnboarding } from "../features/onboarding/store";

export default function WelcomeScreen() {
  const colors = useTheme();
  const router = useRouter();
  const setStage = useOnboarding((state) => state.setStage);
  const enterGuest = useOnboarding((state) => state.enterGuest);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppText role="brand" tone="tertiary">
        CITYDAY
      </AppText>
      <View style={styles.center}>
        <View style={[styles.rule, { backgroundColor: colors.accent }]} />
        <AppText role="display">Your city.</AppText>
        <AppText role="display">Your way.</AppText>
        <AppText role="body" tone="muted">
          A carefully curated city, one good decision at a time.
        </AppText>
      </View>
      <View style={styles.actions}>
        <Button
          label="Get started"
          onPress={() => {
            void setStage("interests").then(() => router.push("/interests"));
          }}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Log in" onPress={() => router.push("/sign-in")} style={styles.link}>
          <AppText role="label">Log in</AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue as guest"
          onPress={() => {
            enterGuest();
            router.replace("/");
          }}
          style={styles.link}
        >
          <AppText role="bodySmall" tone="tertiary">
            Continue as guest
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: space.xl, paddingBottom: space.lg },
  center: { flex: 1, justifyContent: "center", gap: space.sm, paddingBottom: space["2xl"] },
  rule: { width: 36, height: 2, borderRadius: 1, marginBottom: space.lg },
  actions: { gap: space.xs },
  link: { minHeight: 48, alignItems: "center", justifyContent: "center" },
});
