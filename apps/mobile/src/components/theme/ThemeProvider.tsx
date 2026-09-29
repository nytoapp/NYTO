import { type ReactNode } from "react";
import { colors, type ThemeColors } from "./tokens";

const ThemeContextValue: ThemeColors = colors;

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useTheme(): ThemeColors {
  return ThemeContextValue;
}
