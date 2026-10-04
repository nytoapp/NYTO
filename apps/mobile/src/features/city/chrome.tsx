import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View, type ImageStyle, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CityImage } from "./image";
import { city, cityRadius, citySpace, color, elevation } from "./theme";

export function CityText({
  children,
  style,
  tone = "ink",
  size = "body",
  numberOfLines,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  tone?: "ink" | "muted" | "quiet" | "onDark";
  size?: "display" | "title" | "section" | "body" | "meta" | "caption";
  numberOfLines?: number;
}) {
  const color = tone === "muted" ? city.muted : tone === "quiet" ? city.quiet : tone === "onDark" ? city.onDark : city.ink;
  return (
    <Text allowFontScaling maxFontSizeMultiplier={1.3} numberOfLines={numberOfLines} style={[styles[size], { color }, style]}>
      {children}
    </Text>
  );
}

export function CityScreen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.flex}>{children}</View>
      {footer ? <View style={{ paddingBottom: Math.max(insets.bottom, 12), backgroundColor: city.page }}>{footer}</View> : null}
    </View>
  );
}

export function IconButton({ label, icon, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={8} onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={22} color={city.ink} />
    </Pressable>
  );
}

export function DarkButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.darkButton, disabled && styles.darkButtonOff, pressed && !disabled && styles.pressed]}
    >
      <Text allowFontScaling maxFontSizeMultiplier={1.2} style={[styles.darkLabel, disabled && styles.darkLabelOff]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function QuietButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.quietButton, pressed && styles.pressed]}>
      <Text allowFontScaling maxFontSizeMultiplier={1.2} style={styles.quietLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Photo({ uri, style }: { uri: string; style?: StyleProp<ImageStyle> }) {
  return <CityImage uri={uri} style={[styles.photo, style]} />;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionTitle}>
      <CityText size="title">{title}</CityText>
      {action && onAction ? (
        <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onAction}>
          <CityText size="meta" tone="muted">
            {action}
          </CityText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({
  title,
  body,
  action,
  onAction,
  secondary,
  onSecondary,
  icon,
}: {
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
  secondary?: string;
  onSecondary?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.empty}>
      {icon ? <Ionicons name={icon} size={22} color={color.secondaryText} /> : null}
      <CityText size="title">{title}</CityText>
      <CityText tone="muted" style={styles.emptyBody}>
        {body}
      </CityText>
      {action && onAction ? <DarkButton label={action} onPress={onAction} /> : null}
      {secondary && onSecondary ? <QuietButton label={secondary} onPress={onSecondary} /> : null}
    </View>
  );
}

export function GuideFab({ from }: { from?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardOpen(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  if (keyboardOpen) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ask your city guide"
      onPress={() => router.push({ pathname: "/guide", params: from ? { from } : {} })}
      style={({ pressed }) => [styles.fab, elevation.floating, { bottom: Math.max(insets.bottom, 12) + 8 }, pressed && styles.pressed]}
    >
      <Ionicons name="sparkles-outline" size={16} color={city.onDark} />
      <Text allowFontScaling maxFontSizeMultiplier={1.2} style={styles.fabLabel}>
        Ask your city guide
      </Text>
    </Pressable>
  );
}

export function PhotoWash({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient colors={["rgba(28,25,23,0)", "rgba(28,25,23,0.72)"]} style={[styles.wash, style]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: city.page },
  flex: { flex: 1 },
  display: { fontSize: 34, lineHeight: 38, fontWeight: "600", letterSpacing: -0.8 },
  title: { fontSize: 26, lineHeight: 31, fontWeight: "600", letterSpacing: -0.5 },
  section: { fontSize: 17, lineHeight: 22, fontWeight: "600", letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 23, fontWeight: "400" },
  meta: { fontSize: 13, lineHeight: 18, fontWeight: "400" },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "500", letterSpacing: 0.2 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  darkButton: {
    minHeight: 54,
    borderRadius: cityRadius.button,
    backgroundColor: city.dark,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  darkButtonOff: { backgroundColor: color.accentSoft },
  darkLabel: { color: city.onDark, fontSize: 16, fontWeight: "600" },
  darkLabelOff: { color: color.mutedText },
  quietButton: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  quietLabel: { color: city.muted, fontSize: 15, fontWeight: "500" },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  photo: { backgroundColor: city.photo },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: citySpace.page,
    marginBottom: 14,
  },
  empty: { paddingHorizontal: citySpace.page, paddingTop: 48, gap: 12 },
  emptyBody: { maxWidth: 280 },
  fab: {
    position: "absolute",
    right: citySpace.page,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: city.dark,
    borderRadius: 999,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  fabLabel: { color: city.onDark, fontSize: 14, fontWeight: "600" },
  wash: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 14 },
});
