import { createContext, useContext, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, type ThemeColors } from "./tokens";

const ThemeContext = createContext<ThemeColors>(lightColors);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? darkColors : lightColors;
  return <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeColors {
  return useContext(ThemeContext);
}
