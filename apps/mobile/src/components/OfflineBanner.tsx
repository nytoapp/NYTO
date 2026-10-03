import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { color, font, fontScaleCap, space } from "../features/city/theme";

export function OfflineBanner() {
  const { t } = useTranslation();
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
    <View style={[styles.bar, { paddingTop: insets.top + space[8] }]}>
      <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.caption, styles.label]}>
        {t("offline")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingBottom: space[8], paddingHorizontal: space[16], backgroundColor: color.accent },
  label: { color: color.onAccent },
});
