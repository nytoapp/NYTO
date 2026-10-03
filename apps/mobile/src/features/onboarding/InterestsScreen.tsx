import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { city, cityRadius } from "../city/theme";
import { revealApp } from "../landing/reveal";
import { interests } from "./interests";
import { useOnboarding } from "./store";

const pad = 20;
const gap = 10;

export function InterestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const stored = useOnboarding((state) => state.interests);
  const enterApp = useOnboarding((state) => state.enterApp);
  const stage = useOnboarding((state) => state.stage);
  const setStage = useOnboarding((state) => state.setStage);
  const [selected, setSelected] = useState<string[]>(stored);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const enter = useRef(new Animated.Value(0)).current;
  const cardWidth = Math.floor((width - pad * 2 - gap * 2) / 3);

  useEffect(() => {
    revealApp();
    Animated.timing(enter, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [enter]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      useOnboarding.setState({ interests: next });
      return next;
    });
  }

  function finish(ids: string[]) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    void enterApp(ids)
      .then(() => router.replace("/"))
      .catch(() => {
        savingRef.current = false;
        setSaving(false);
      });
  }

  function back() {
    if (stage === "app") {
      router.back();
      return;
    }
    void setStage("welcome").then(() => router.back());
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 24, paddingHorizontal: pad }} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
          <View style={styles.top}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={back} style={styles.hit}>
              <Ionicons name="chevron-back" size={26} color={city.ink} />
            </Pressable>
            <View accessibilityRole="progressbar" accessibilityLabel="Step 2 of 2" style={styles.progress}>
              <View style={[styles.segment, styles.segmentOn]} />
              <View style={[styles.segment, styles.segmentCurrent]} />
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Skip" onPress={() => finish([])} style={styles.hit}>
              <Text allowFontScaling style={styles.skip}>
                Skip
              </Text>
            </Pressable>
          </View>
          <Text allowFontScaling maxFontSizeMultiplier={1.25} accessibilityRole="header" style={styles.heading}>
            What are you in the mood for?
          </Text>
          <Text allowFontScaling maxFontSizeMultiplier={1.3} style={styles.support}>
            Choose a few things you enjoy. This is optional.
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
                  style={({ pressed }) => [styles.card, { width: cardWidth, height: Math.round(cardWidth * 1.28) }, on && styles.cardOn, pressed && styles.pressed]}
                >
                  <Image source={item.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <LinearGradient colors={["rgba(28,25,23,0.05)", "rgba(28,25,23,0.78)"]} style={StyleSheet.absoluteFill} />
                  {on ? (
                    <View style={styles.check}>
                      <Ionicons name="checkmark" size={14} color={city.ink} />
                    </View>
                  ) : null}
                  <Ionicons name={item.icon} size={18} color="#F6F3EE" />
                  <Text allowFontScaling maxFontSizeMultiplier={1.15} style={styles.label}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue"
          accessibilityState={{ disabled: saving }}
          disabled={saving}
          onPress={() => finish(selected)}
          style={({ pressed }) => [styles.continue, pressed && styles.pressed]}
        >
          <Text allowFontScaling style={styles.continueLabel}>
            Continue
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: city.page },
  top: { minHeight: 48, flexDirection: "row", alignItems: "center" },
  hit: { minWidth: 52, minHeight: 44, justifyContent: "center" },
  progress: { flex: 1, flexDirection: "row", justifyContent: "center", gap: 8 },
  segment: { width: 28, height: 3, borderRadius: 2, backgroundColor: "#DDD6CC" },
  segmentOn: { backgroundColor: city.ink },
  segmentCurrent: { width: 40, backgroundColor: city.ink },
  skip: { color: city.muted, fontSize: 15, fontWeight: "500", textAlign: "right" },
  heading: { color: city.ink, fontSize: 32, lineHeight: 37, fontWeight: "600", letterSpacing: -0.7, marginTop: 20 },
  support: { color: city.muted, fontSize: 16, lineHeight: 23, marginTop: 8, maxWidth: 320 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap, marginTop: 28 },
  card: { borderRadius: cityRadius.image, overflow: "hidden", justifyContent: "flex-end", padding: 10, gap: 6, borderWidth: 2, borderColor: "transparent" },
  cardOn: { borderColor: city.ink },
  check: { position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: "#F6F3EE", alignItems: "center", justifyContent: "center" },
  label: { color: "#F6F3EE", fontSize: 13, lineHeight: 16, fontWeight: "600" },
  footer: { paddingHorizontal: pad, backgroundColor: city.page },
  continue: { minHeight: 54, borderRadius: 28, backgroundColor: city.ink, alignItems: "center", justifyContent: "center" },
  continueLabel: { color: city.onDark, fontSize: 16, fontWeight: "600" },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
});
