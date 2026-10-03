import { Platform, type TextStyle, type ViewStyle } from "react-native";

/** Georgia for display and h1. Welcome imports the same family from the token bridge. */
export const serif = Platform.select({ ios: "Georgia", android: "serif", default: "serif" });

export const color = {
  background: "#F6F3EE",
  surface: "#FFFCF8",
  surfaceElevated: "#FFFCF8",
  primaryText: "#1C1917",
  secondaryText: "#6F6A63",
  mutedText: "#8C867E",
  border: "#E4DDD3",
  accent: "#1C1917",
  accentSoft: "#EFEBE4",
  onAccent: "#F6F3EE",
  success: "#3E6B54",
  warning: "#8A5A2B",
  error: "#8C3A32",
  imagePlaceholder: "#DDD6CC",
  overlay: "rgba(28, 25, 23, 0.72)",
} as const;

export const space = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  48: 48,
  64: 64,
  page: 20,
} as const;

export const radius = {
  small: 8,
  medium: 12,
  large: 16,
  card: 18,
  pill: 999,
  image: 16,
  modal: 24,
} as const;

export const motion = {
  press: 120,
  appear: 220,
  fade: 180,
  sheet: 280,
  pressScale: 0.985,
} as const;

export const fontScaleCap = 1.3;

function textRole(size: number, lineHeight: number, fontWeight: TextStyle["fontWeight"], letterSpacing: number, editorial = false): TextStyle {
  return {
    fontFamily: editorial ? serif : undefined,
    fontSize: size,
    lineHeight,
    fontWeight,
    letterSpacing,
  };
}

export const font = {
  display: textRole(34, 38, "500", -0.6, true),
  h1: textRole(28, 32, "500", -0.5, true),
  h2: textRole(22, 28, "600", -0.3),
  h3: textRole(17, 22, "600", -0.2),
  body: textRole(16, 23, "400", 0),
  bodyMedium: textRole(16, 23, "500", 0),
  bodySmall: textRole(14, 20, "400", 0),
  caption: textRole(12, 16, "500", 0.4),
  label: textRole(13, 18, "500", 0.2),
  button: textRole(16, 20, "600", 0),
  navigation: textRole(11, 14, "500", 0.2),
} as const;

export const elevation = {
  flat: {} as ViewStyle,
  floating: {
    shadowColor: color.primaryText,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  } as ViewStyle,
};

/** Names already used by screens. Values point at the semantic palette. */
export const city = {
  page: color.background,
  paper: color.surface,
  ink: color.primaryText,
  muted: color.secondaryText,
  quiet: color.mutedText,
  line: color.border,
  chip: color.accentSoft,
  dark: color.accent,
  onDark: color.onAccent,
  photo: color.imagePlaceholder,
  danger: color.error,
} as const;

/** Screen inset and gaps already used in layouts. `section` stays 28 until those screens move onto the scale. */
export const citySpace = {
  page: space.page,
  section: 28,
  card: space[12],
  tight: space[8],
} as const;

/** `button` stays 28 so the existing dark button does not change shape before Batch 2. */
export const cityRadius = {
  card: radius.card,
  image: radius.image,
  button: 28,
  chip: radius.pill,
} as const;
