import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText, Button } from "../components/ui";
import { useTheme } from "../components/theme/ThemeProvider";
import { pageInset, space } from "../components/theme/tokens";
import { interests } from "../features/onboarding/interests";
import { useOnboarding } from "../features/onboarding/store";

export default function InterestsScreen() {
  const colors = useTheme();
  const router = useRouter();
  const stored = useOnboarding((state) => state.interests);
  const setInterests = useOnboarding((state) => state.setInterests);
  const enterApp = useOnboarding((state) => state.enterApp);
  const stage = useOnboarding((state) => state.stage);
  const setStage = useOnboarding((state) => state.setStage);
  const [selected, setSelected] = useState<string[]>(stored);

  function toggle(id: string) {
    setSelected((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      void setInterests(next);
      return next;
    });
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => {
            if (stage === "app") {
              router.back();
              return;
            }
            void setStage("welcome").then(() => router.back());
          }}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={22} color={colors.primaryText} />
        </Pressable>
        <AppText role="brand" tone="tertiary">
          CITYDAY
        </AppText>
        <AppText role="title">What are you into?</AppText>
        <AppText tone="muted">Choose a few. We will use them to shape your city.</AppText>
        <View style={styles.list}>
          {interests.map((item) => {
            const on = selected.includes(item.id);
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={item.label}
                onPress={() => toggle(item.id)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    borderBottomColor: colors.divider,
                    backgroundColor: on ? colors.surfaceSelected : "transparent",
                    transform: [{ scale: pressed ? 0.985 : 1 }],
                  },
                ]}
              >
                <View style={[styles.tick, { backgroundColor: on ? colors.accent : "transparent" }]} />
                <Ionicons name={item.icon} size={18} color={on ? colors.primaryText : colors.secondaryText} />
                <View style={styles.label}>
                  <AppText role="bodyLarge">{item.label}</AppText>
                </View>
                {on ? <Ionicons name="checkmark" size={18} color={colors.accent} /> : <View style={styles.mark} />}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button
          label="Continue"
          disabled={selected.length === 0}
          onPress={() => {
            void enterApp(selected).then(() => router.replace("/"));
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { paddingHorizontal: pageInset, paddingTop: space.md, paddingBottom: space.lg, gap: space.md },
  back: { width: 44, height: 44, alignItems: "flex-start", justifyContent: "center" },
  list: { marginTop: space.sm },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingRight: space.sm,
  },
  tick: { width: 2, alignSelf: "stretch", marginVertical: 14 },
  label: { flex: 1 },
  mark: { width: 18 },
  footer: { paddingHorizontal: pageInset, paddingBottom: space.md },
});
