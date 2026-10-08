import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { saveInterests } from "../auth/account";
import { useSession } from "../auth/useSession";
import { IconButton, PrimaryButton } from "../city/buttons";
import { color, font, fontScaleCap, motion, radius, space } from "../city/theme";
import { revealApp } from "../landing/reveal";
import { interests } from "./interests";
import { leave } from "../nav/leave";
import { useOnboarding } from "./store";

const gap = space[12];

export function InterestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ mode?: string }>();
  const editing = params.mode === "edit";
  const { signedIn } = useSession();
  const { width } = useWindowDimensions();
  const stored = useOnboarding((state) => state.interests);
  const setInterests = useOnboarding((state) => state.setInterests);
  const enterApp = useOnboarding((state) => state.enterApp);
  const stage = useOnboarding((state) => state.stage);
  const setStage = useOnboarding((state) => state.setStage);
  const [selected, setSelected] = useState<string[]>(stored);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const enter = useRef(new Animated.Value(0)).current;
  const cardWidth = Math.floor((width - space.page * 2 - gap * 2) / 3);

  useEffect(() => {
    revealApp();
    Animated.timing(enter, { toValue: 1, duration: motion.appear, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [enter]);

  function toggle(id: string) {
    setError(null);
    setSelected((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      if (!editing) useOnboarding.setState({ interests: next });
      return next;
    });
  }

  function finish(ids: string[]) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    const done = editing
      ? (signedIn ? saveInterests(ids).then((account) => queryClient.setQueryData(["account"], account)) : Promise.resolve()).then(() => setInterests(ids)).then(() => leave(router, "/profile"))
      : enterApp(ids).then(() => router.replace("/"));
    void done.catch(() => {
      savingRef.current = false;
      setSaving(false);
      setError("Your choices could not be saved. Try again.");
    });
  }

  function back() {
    if (editing) {
      leave(router, "/profile");
      return;
    }
    if (stage === "app") {
      leave(router, "/");
      return;
    }
    void setStage("welcome").then(() => router.replace("/welcome"));
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + space[8], paddingBottom: space[24], paddingHorizontal: space.page }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
          <View style={styles.top}>
            <IconButton label="Back" icon="chevron-back" onPress={back} />
            {editing ? (
              <View style={styles.progress} />
            ) : (
              <View accessibilityRole="progressbar" accessibilityLabel="Step 2 of 2" style={styles.progress}>
                <View style={[styles.segment, styles.segmentOn]} />
                <View style={[styles.segment, styles.segmentCurrent]} />
              </View>
            )}
            {editing ? (
              <View style={styles.skipHit} />
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel="Skip" onPress={() => finish([])} style={styles.skipHit}>
                <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.label, styles.skip]}>
                  Skip
                </Text>
              </Pressable>
            )}
          </View>
          <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} accessibilityRole="header" style={[font.display, styles.heading]}>
            {editing ? "Your interests" : "What are you in the mood for?"}
          </Text>
          <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.body, styles.support]}>
            {editing ? (signedIn ? "These stay with your CITYDAY account." : "These stay on this phone until you have an account.") : "Choose a few things you enjoy. This is optional."}
          </Text>
          <View style={styles.grid}>
            {interests.map((item) => {
              const on = selected.includes(item.id);
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label}, ${on ? "selected" : "not selected"}`}
                  accessibilityState={{ selected: on }}
                  onPress={() => toggle(item.id)}
                  style={({ pressed }) => [
                    styles.card,
                    { width: cardWidth, height: Math.round(cardWidth * 1.28) },
                    on && styles.cardOn,
                    pressed && { transform: [{ scale: motion.pressScale }] },
                  ]}
                >
                  <Image source={item.image} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
                  <LinearGradient colors={["rgba(28,25,23,0.05)", color.overlay]} style={StyleSheet.absoluteFill} />
                  {on ? (
                    <View style={styles.check}>
                      <Ionicons name="checkmark" size={14} color={color.primaryText} />
                    </View>
                  ) : null}
                  <Ionicons name={item.icon} size={18} color={color.onAccent} />
                  <Text allowFontScaling maxFontSizeMultiplier={1.15} style={[font.label, styles.label]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space[12]) }]}>
        {error ? (
          <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.bodySmall, styles.error]}>
            {error}
          </Text>
        ) : null}
        <PrimaryButton label={saving ? "Saving" : editing ? "Save" : "Continue"} onPress={() => finish(selected)} disabled={saving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  top: { minHeight: 48, flexDirection: "row", alignItems: "center" },
  progress: { flex: 1, flexDirection: "row", justifyContent: "center", gap: space[8] },
  segment: { width: 28, height: 3, borderRadius: 2, backgroundColor: color.imagePlaceholder },
  segmentOn: { backgroundColor: color.accent },
  segmentCurrent: { width: 40, backgroundColor: color.accent },
  skipHit: { minWidth: 52, minHeight: 48, justifyContent: "center", alignItems: "flex-end" },
  skip: { color: color.secondaryText },
  heading: { color: color.primaryText, marginTop: space[16] },
  support: { color: color.secondaryText, marginTop: space[8], maxWidth: 320 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap, marginTop: space[32] },
  card: {
    borderRadius: radius.image,
    overflow: "hidden",
    justifyContent: "flex-end",
    padding: space[12],
    gap: space[4],
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardOn: { borderColor: color.accent },
  check: {
    position: "absolute",
    top: space[8],
    right: space[8],
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { color: color.onAccent },
  footer: { paddingHorizontal: space.page, paddingTop: space[8], gap: space[8], backgroundColor: color.background },
  error: { color: color.error },
});
