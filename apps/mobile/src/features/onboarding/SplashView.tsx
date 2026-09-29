import { StyleSheet, View } from "react-native";
import { AppText } from "../../components/ui";
import { useTheme } from "../../components/theme/ThemeProvider";
import { space } from "../../components/theme/tokens";

export function SplashView() {
  const colors = useTheme();
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppText role="brand" tone="tertiary">
        CITYDAY
      </AppText>
      <AppText role="display">Your city.</AppText>
      <AppText role="display">Your way.</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "flex-start", justifyContent: "flex-end", padding: space[6], gap: space[2], paddingBottom: space[12] },
});
