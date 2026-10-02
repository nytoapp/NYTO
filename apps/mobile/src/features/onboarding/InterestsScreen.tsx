import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { interests } from "./interests";
import { useOnboarding } from "./store";
import { revealApp } from "../landing/reveal";

const page = "#F7F5F1";
const ink = "#1A1C1A";
const muted = "#8A8680";
const card = "#EEEBE6";
const cardSelected = "#E4DFD6";
const track = "#DDD9D2";
const disabledFill = "#E3DFD8";
const disabledInk = "#A39E96";

/** Welcome, then this screen. The app itself is not an onboarding step. */
const steps = ["welcome", "interests"] as const;
const currentStep = 1;

const pad = 24;
const gap = 12;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (alive) setReduced(value);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}

function Progress() {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${currentStep + 1} of ${steps.length}`}
      accessibilityValue={{ min: 1, max: steps.length, now: currentStep + 1 }}
      style={styles.progress}
    >
      {steps.map((step, index) => {
        const reached = index <= currentStep;
        const current = index === currentStep;
        return <View key={step} style={[styles.segment, current && styles.segmentCurrent, { backgroundColor: reached ? ink : track }]} />;
      })}
    </View>
  );
}

export function InterestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const stored = useOnboarding((state) => state.interests);
  const enterApp = useOnboarding((state) => state.enterApp);
  const stage = useOnboarding((state) => state.stage);
  const setStage = useOnboarding((state) => state.setStage);
  const [selected, setSelected] = useState<string[]>(stored);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const header = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const grid = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const action = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  const cardWidth = Math.floor((width - pad * 2 - gap * 2) / 3);
  const cardHeight = Math.max(112, Math.round(cardWidth * 1.08));
  const ready = selected.length > 0 && !saving;

  useEffect(() => {
    revealApp();
  }, []);

  useEffect(() => {
    if (reduced) {
      header.setValue(1);
      grid.setValue(1);
      action.setValue(1);
      return;
    }
    const entrance = Animated.stagger(80, [
      Animated.timing(header, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(grid, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(action, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    entrance.start();
    return () => entrance.stop();
  }, [action, grid, header, reduced]);

  function rise(value: Animated.Value) {
    return {
      opacity: value,
      transform: [
        {
          translateY: value.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
        },
      ],
    };
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      useOnboarding.setState({ interests: next });
      return next;
    });
  }

  function back() {
    if (stage === "app") {
      router.back();
      return;
    }
    void setStage("welcome").then(() => router.back());
  }

  function continueNext() {
    if (!ready || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    void enterApp(selected)
      .then(() => router.replace("/"))
      .catch(() => {
        savingRef.current = false;
        setSaving(false);
      });
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[styles.page, { paddingTop: insets.top + 8, paddingBottom: 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={rise(header)}>
          <View style={styles.top}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={8}
              onPress={back}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back" size={24} color={ink} />
            </Pressable>
            <Progress />
            <View style={styles.balance} />
          </View>
          <Text allowFontScaling maxFontSizeMultiplier={1.25} accessibilityRole="header" style={styles.heading}>
            What are you into?
          </Text>
          <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.support}>
            Select a few interests to get personalized recommendations.
          </Text>
        </Animated.View>
        <Animated.View style={[styles.grid, rise(grid)]}>
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
                  { width: cardWidth, height: cardHeight, backgroundColor: on ? cardSelected : card, borderColor: on ? ink : "transparent" },
                  pressed && styles.cardPressed,
                ]}
              >
                <Ionicons name={item.icon} size={26} color={ink} />
                <Text allowFontScaling maxFontSizeMultiplier={1.2} style={styles.label}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>
        <View style={styles.spacer} />
      </ScrollView>
      <Animated.View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }, rise(action)]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue"
          accessibilityState={{ disabled: !ready }}
          disabled={!ready}
          onPress={continueNext}
          style={({ pressed }) => [styles.continue, !ready && styles.continueDisabled, pressed && ready && styles.pressed]}
        >
          <Text allowFontScaling maxFontSizeMultiplier={1.2} style={[styles.continueLabel, !ready && styles.continueLabelDisabled]}>
            Continue
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: page },
  page: { flexGrow: 1, paddingHorizontal: pad },
  top: { minHeight: 48, flexDirection: "row", alignItems: "center" },
  back: { width: 44, height: 44, alignItems: "flex-start", justifyContent: "center" },
  balance: { width: 44 },
  progress: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  segment: { width: 28, height: 3, borderRadius: 2 },
  segmentCurrent: { width: 36 },
  heading: { color: ink, fontSize: 32, lineHeight: 38, fontWeight: "600", letterSpacing: -0.4, marginTop: 28 },
  support: { color: muted, fontSize: 16, lineHeight: 23, marginTop: 8, maxWidth: 320 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap, marginTop: 32 },
  card: {
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 16,
    gap: 10,
  },
  cardPressed: { transform: [{ scale: 0.97 }] },
  label: { color: ink, fontSize: 13, lineHeight: 17, fontWeight: "500", textAlign: "center" },
  spacer: { flexGrow: 1, minHeight: 28 },
  footer: { paddingHorizontal: pad, backgroundColor: page },
  continue: { minHeight: 56, borderRadius: 28, backgroundColor: ink, alignItems: "center", justifyContent: "center" },
  continueDisabled: { backgroundColor: disabledFill },
  continueLabel: { color: "#F7F5F1", fontSize: 16, fontWeight: "600" },
  continueLabelDisabled: { color: disabledInk },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
});
