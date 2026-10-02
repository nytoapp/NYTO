import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ImageStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useIsFocused, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { serif } from "../../components/theme/tokens";
import { useOnboarding } from "../onboarding/store";
import { landingFadeMs, landingHoldMs, stockholmLanding, type LandingContent, type LandingFrame } from "./content";
import { revealApp } from "./reveal";

const ivory = "#F7F4EE";
const ink = "#121418";
const dusk = "#1A2330";

const scrimColors = [
  "rgba(9, 14, 22, 0.36)",
  "rgba(9, 14, 22, 0.08)",
  "rgba(9, 14, 22, 0)",
  "rgba(9, 14, 22, 0)",
  "rgba(9, 14, 22, 0.14)",
  "rgba(9, 14, 22, 0.4)",
] as const;

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

function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      setActive(state === "active");
    });
    return () => subscription.remove();
  }, []);
  return active;
}

function frameStyle(frame: LandingFrame, screenW: number, screenH: number): ImageStyle {
  const meta = Image.resolveAssetSource(frame.source);
  const imgW = meta?.width || screenW;
  const imgH = meta?.height || screenH;
  if (!screenW || !screenH || !imgW || !imgH) {
    return StyleSheet.absoluteFill;
  }
  const cover = Math.max(screenW / imgW, screenH / imgH);
  const renderedW = imgW * cover * frame.zoom;
  const renderedH = imgH * cover * frame.zoom;
  return {
    position: "absolute",
    width: renderedW,
    height: renderedH,
    left: -Math.max(renderedW - screenW, 0) * frame.focusX,
    top: -Math.max(renderedH - screenH, 0) * frame.focusY,
  };
}

function HeroImage({
  frame,
  width,
  height,
  onError,
  onLoad,
}: {
  frame: LandingFrame;
  width: number;
  height: number;
  onError: () => void;
  onLoad?: () => void;
}) {
  return (
    <Image
      source={frame.source}
      resizeMode="cover"
      fadeDuration={0}
      onError={onError}
      onLoad={onLoad}
      style={frameStyle(frame, width, height)}
    />
  );
}

function Crossfade({
  frames,
  active,
  reduced,
  onReady,
}: {
  frames: readonly LandingFrame[];
  active: boolean;
  reduced: boolean;
  onReady: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const count = frames.length;
  const [base, setBase] = useState(0);
  const [incoming, setIncoming] = useState(count > 1 ? 1 : 0);
  const opacity = useRef(new Animated.Value(0)).current;
  const commit = useRef(false);
  const failed = useRef(new Set<number>());
  const loaded = useRef(new Set<number>());
  const ready = useRef(false);
  const baseRef = useRef(0);
  const incomingRef = useRef(incoming);
  baseRef.current = base;
  incomingRef.current = incoming;

  const nextGood = useCallback(
    (from: number) => {
      if (count === 0) return 0;
      let next = (from + 1) % count;
      for (let step = 0; step < count; step += 1) {
        if (!failed.current.has(next)) return next;
        next = (next + 1) % count;
      }
      return from;
    },
    [count],
  );
  const nextGoodRef = useRef(nextGood);
  nextGoodRef.current = nextGood;

  useEffect(() => {
    frames.forEach((frame) => {
      const resolved = Image.resolveAssetSource(frame.source);
      if (resolved?.uri) void Image.prefetch(resolved.uri);
    });
  }, [frames]);

  useEffect(() => {
    if (!commit.current) return;
    commit.current = false;
    opacity.setValue(0);
    const next = nextGood(base);
    if (next !== base) setIncoming(next);
  }, [base, nextGood, opacity]);

  useEffect(() => {
    if (!active || reduced || count < 2) {
      opacity.setValue(0);
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    let waits = 0;
    const fade = () => {
      const current = baseRef.current;
      const target = nextGoodRef.current(current);
      if (!alive || target === current) return;
      if (!loaded.current.has(target) && waits < 6) {
        waits += 1;
        timer = setTimeout(fade, 280);
        return;
      }
      waits = 0;
      Animated.timing(opacity, {
        toValue: 1,
        duration: landingFadeMs,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || !alive) return;
        commit.current = true;
        baseRef.current = target;
        setBase(target);
        timer = setTimeout(fade, landingHoldMs);
      });
    };
    timer = setTimeout(fade, landingHoldMs);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      opacity.stopAnimation();
    };
  }, [active, count, opacity, reduced]);

  const markReady = () => {
    if (ready.current) return;
    ready.current = true;
    onReady();
  };

  const noteLoaded = (index: number) => {
    loaded.current.add(index);
    markReady();
  };

  const fail = (index: number) => {
    failed.current.add(index);
    if (failed.current.size >= count) {
      markReady();
      return;
    }
    if (index === baseRef.current) {
      const next = nextGood(index);
      commit.current = false;
      opacity.setValue(0);
      baseRef.current = next;
      setBase(next);
      setIncoming(nextGood(next));
      return;
    }
    if (index === incomingRef.current) setIncoming(nextGood(index));
  };

  const baseFrame = frames[base] ?? frames[0];
  const nextFrame = frames[incoming] ?? baseFrame;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {baseFrame ? (
        <View style={styles.frame} collapsable={false}>
          <HeroImage
            frame={baseFrame}
            width={width}
            height={height}
            onError={() => fail(base)}
            onLoad={() => noteLoaded(base)}
          />
        </View>
      ) : null}
      {nextFrame && count > 1 ? (
        <Animated.View style={[styles.frame, { opacity }]} collapsable={false}>
          <HeroImage
            frame={nextFrame}
            width={width}
            height={height}
            onError={() => fail(incoming)}
            onLoad={() => noteLoaded(incoming)}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

function LandingButton({
  label,
  onPress,
  variant,
}: {
  label: string;
  onPress: () => void;
  variant: "primary" | "secondary";
}) {
  const primary = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.primary : styles.secondary,
        pressed && (primary ? styles.primaryPressed : styles.secondaryPressed),
        pressed && styles.pressed,
      ]}
    >
      <Text allowFontScaling maxFontSizeMultiplier={1.2} style={[styles.buttonLabel, { color: primary ? ink : ivory }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function LandingScreen({ content = stockholmLanding }: { content?: LandingContent }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const focused = useIsFocused();
  const appActive = useAppActive();
  const reduced = useReducedMotion();
  const setStage = useOnboarding((state) => state.setStage);
  const leaving = useRef(false);
  const compact = height < 700;

  useFocusEffect(
    useCallback(() => {
      leaving.current = false;
    }, []),
  );

  function go(path: "/interests" | "/sign-in") {
    if (leaving.current) return;
    leaving.current = true;
    if (path === "/sign-in") {
      router.push(path);
      return;
    }
    void setStage("interests")
      .then(() => router.push("/interests"))
      .catch(() => {
        leaving.current = false;
      });
  }

  return (
    <View style={styles.screen}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <Crossfade frames={content.frames} active={focused && appActive} reduced={reduced} onReady={revealApp} />
      <LinearGradient
        pointerEvents="none"
        colors={scrimColors}
        locations={[0, 0.14, 0.3, 0.56, 0.78, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.copy, { paddingTop: insets.top + (compact ? 18 : 32) }]} pointerEvents="none">
        <Text allowFontScaling maxFontSizeMultiplier={1.25} accessibilityRole="header" style={[styles.wordmark, compact && styles.wordmarkCompact]}>
          {content.wordmark}
        </Text>
        <Text allowFontScaling maxFontSizeMultiplier={1.25} style={styles.tagline}>
          {content.tagline}
        </Text>
      </View>
      <View style={styles.spacer} />
      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}>
        <LandingButton label="Get started" variant="primary" onPress={() => go("/interests")} />
        <LandingButton label="Log in" variant="secondary" onPress={() => go("/sign-in")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: dusk },
  frame: { ...StyleSheet.absoluteFill, overflow: "hidden" },
  copy: { alignItems: "center", paddingHorizontal: 32 },
  wordmark: {
    color: ivory,
    fontFamily: serif,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 4,
    fontWeight: "500",
    textShadowColor: "rgba(6, 10, 16, 0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  wordmarkCompact: { fontSize: 28, lineHeight: 34, letterSpacing: 3.2 },
  tagline: {
    color: "rgba(247, 244, 238, 0.92)",
    fontSize: 16,
    lineHeight: 22,
    marginTop: 8,
    fontWeight: "400",
    textShadowColor: "rgba(6, 10, 16, 0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  spacer: { flex: 1 },
  actions: { paddingHorizontal: 24, gap: 12 },
  button: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  primary: { backgroundColor: ivory },
  primaryPressed: { backgroundColor: "#E7E2D8" },
  secondary: {
    backgroundColor: "rgba(8, 12, 18, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(247, 244, 238, 0.84)",
  },
  secondaryPressed: { backgroundColor: "rgba(8, 12, 18, 0.38)" },
  pressed: { transform: [{ scale: 0.98 }] },
  buttonLabel: { fontSize: 16, fontWeight: "600" },
});
