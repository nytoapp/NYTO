import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppText } from "./ui";
import { useTheme } from "./theme/ThemeProvider";

export function OfflineBanner() {
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      setOffline(state.isConnected === false);
    });
  }, []);
  if (!offline) {
    return null;
  }
  return (
    <View style={[styles.bar, { backgroundColor: colors.paper, paddingTop: insets.top + 6 }]}>
      <AppText role="caption" tone="onPaper">
        {t("offline")}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingBottom: 8, paddingHorizontal: 16 },
});





