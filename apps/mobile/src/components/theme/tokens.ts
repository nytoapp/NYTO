export const space = {
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
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const type = {
  display: 30,
  title: 24,
  headline: 18,
  body: 16,
  label: 14,
  caption: 12,
} as const;

export const lightColors = {
  background: "#F3EFE7",
  surface: "#FFFCF7",
  ink: "#1A1814",
  muted: "#6E675E",
  accent: "#1E4638",
  accentInk: "#F7F3EC",
  clay: "#C4622D",
  accentSoft: "#E5F0EA",
  claySoft: "#F8E7DA",
  line: "#E4DCD0",
  danger: "#8C3A32",
  dangerSurface: "#F8E8E4",
  scrim: "rgba(26, 24, 20, 0.45)",
  shadow: "rgba(26, 24, 20, 0.08)",
};

export const darkColors = {
  background: "#12110F",
  surface: "#1C1A17",
  ink: "#F6F1E8",
  muted: "#B7AFA4",
  accent: "#9DCFC0",
  accentInk: "#12211C",
  clay: "#E7A06A",
  accentSoft: "#24332E",
  claySoft: "#3A2A22",
  line: "#322E29",
  danger: "#E7B2AA",
  dangerSurface: "#3A2422",
  scrim: "rgba(0, 0, 0, 0.62)",
  shadow: "rgba(0, 0, 0, 0.35)",
};

export type ThemeColors = typeof lightColors;

export const hitTarget = 44;
export const pageInset = space[4];
export const motion = { fast: 180, layout: 240 };
