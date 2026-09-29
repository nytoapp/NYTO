import { Platform, type TextStyle, type ViewStyle } from "react-native";

/** Cool near-black. One palette, owned by CITYDAY. System theme must not invert it. */
export const colors = {
  background: "#08090B",
  surface: "#111318",
  elevatedSurface: "#181B22",
  elevated: "#181B22",
  surfacePressed: "#22262F",
  surfaceSelected: "#1C2028",
  primaryText: "#F5F6F8",
  ink: "#F5F6F8",
  secondaryText: "#C6CBD4",
  muted: "#C6CBD4",
  tertiaryText: "#9AA1AC",
  tertiary: "#9AA1AC",
  mutedText: "#8E96A3",
  border: "#2A2F38",
  line: "#2A2F38",
  divider: "#20242C",
  accent: "#FF4D3A",
  accentPressed: "#E23E2D",
  accentInk: "#F5F6F8",
  success: "#7DCAA8",
  warning: "#E4C07A",
  error: "#FF8B7A",
  danger: "#FF8B7A",
  overlay: "rgba(0, 0, 0, 0.66)",
  scrim: "rgba(0, 0, 0, 0.66)",
  paper: "#F5F6F8",
  paperInk: "#08090B",
  clay: "#FF4D3A",
  accentSoft: "#1C2028",
  claySoft: "#2A1614",
  dangerSurface: "#2A1614",
  shadow: "rgba(0, 0, 0, 0.45)",
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

export const serif = Platform.select({ ios: "Georgia", android: "serif", default: "serif" });

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
  subtle: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 2, elevation: 1 },
  card: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: 2 },
  floating: { shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.28, shadowRadius: 24, elevation: 6 },
  modal: { shadowColor: "#000", shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.36, shadowRadius: 32, elevation: 12 },
};
