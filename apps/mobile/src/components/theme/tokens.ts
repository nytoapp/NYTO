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
  display: 34,
  title: 28,
  headline: 20,
  body: 16,
  label: 14,
  caption: 12,
} as const;

export const lightColors = {
  background: "#F6F4F1",
  surface: "#FFFCF8",
  ink: "#1C1917",
  muted: "#675F58",
  accent: "#1F4D45",
  accentInk: "#F6F4F1",
  line: "#E4DDD4",
  danger: "#8C3A32",
  dangerSurface: "#F8E8E4",
  scrim: "rgba(28, 25, 23, 0.4)",
};

export const darkColors = {
  background: "#141311",
  surface: "#1E1C1A",
  ink: "#F4F0EA",
  muted: "#B7AFA6",
  accent: "#8FB8AE",
  accentInk: "#141311",
  line: "#34302C",
  danger: "#E7B2AA",
  dangerSurface: "#3A2422",
  scrim: "rgba(0, 0, 0, 0.55)",
};

export type ThemeColors = typeof lightColors;

export const hitTarget = 44;
export const pageInset = space[4];
export const motion = { fast: 180, layout: 240 };
