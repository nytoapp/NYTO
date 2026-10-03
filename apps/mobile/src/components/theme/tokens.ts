import { type TextStyle, type ViewStyle } from "react-native";
import { color, elevation as cityElevation, serif } from "../../features/city/theme";

export { serif };

/** Warm product palette. Older key names remain so sign-in and the error boundary keep compiling. */
export const colors = {
  background: color.background,
  surface: color.surface,
  elevatedSurface: color.surfaceElevated,
  elevated: color.surfaceElevated,
  surfacePressed: color.accentSoft,
  surfaceSelected: color.accentSoft,
  primaryText: color.primaryText,
  ink: color.primaryText,
  secondaryText: color.secondaryText,
  muted: color.secondaryText,
  tertiaryText: color.mutedText,
  tertiary: color.mutedText,
  mutedText: color.mutedText,
  border: color.border,
  line: color.border,
  divider: color.border,
  accent: color.accent,
  accentPressed: color.accent,
  accentInk: color.onAccent,
  onAccent: color.onAccent,
  success: color.success,
  warning: color.warning,
  error: color.error,
  danger: color.error,
  overlay: color.overlay,
  scrim: color.overlay,
  paper: color.surface,
  paperInk: color.primaryText,
  clay: color.error,
  accentSoft: color.accentSoft,
  claySoft: color.accentSoft,
  dangerSurface: color.accentSoft,
  imagePlaceholder: color.imagePlaceholder,
  shadow: "rgba(28, 25, 23, 0.08)",
} as const;

export const lightColors = colors;
export const darkColors = colors;
export type ThemeColors = typeof colors;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const radius = {
  small: 8,
  sm: 8,
  medium: 12,
  md: 12,
  large: 16,
  lg: 16,
  card: 18,
  pill: 999,
} as const;

export const type = {
  display: 36,
  headlineLarge: 32,
  headlineMedium: 26,
  headlineSmall: 20,
  headline: 18,
  title: 32,
  bodyLarge: 17,
  body: 16,
  bodySmall: 14,
  label: 15,
  caption: 13,
  brand: 11,
} as const;

export const hitTarget = 48;
export const pageInset = 20;

export const motion = {
  instant: 80,
  fast: 140,
  normal: 220,
  emphasized: 320,
  spring: 280,
} as const;

const serifRoles = new Set<keyof typeof type>(["display", "title", "headlineLarge", "headlineMedium"]);

export function typeStyle(role: keyof typeof type): TextStyle {
  const size = type[role];
  const editorial = serifRoles.has(role);
  return {
    fontFamily: editorial ? serif : undefined,
    fontSize: size,
    lineHeight: editorial ? Math.round(size * 1.08) : Math.round(size * 1.4),
    letterSpacing: role === "brand" ? 2.2 : editorial ? -0.6 : 0,
    fontWeight: role === "display" || role === "title" || role === "headlineLarge" ? "500" : role === "body" || role === "bodyLarge" || role === "caption" || role === "bodySmall" ? "400" : "600",
  };
}

export const elevation: Record<"subtle" | "card" | "floating" | "modal", ViewStyle> = {
  subtle: cityElevation.flat,
  card: cityElevation.flat,
  floating: cityElevation.floating,
  modal: cityElevation.floating,
};
