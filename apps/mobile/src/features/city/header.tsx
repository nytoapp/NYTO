import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, font, fontScaleCap, space } from "./theme";

export function CityHeader({
  title,
  subtitle,
  onBack,
  right,
  transparent = false,
  safe = true,
}: {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  transparent?: boolean;
  safe?: boolean;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: safe ? insets.top + space[8] : space[8],
        paddingHorizontal: space.page,
        paddingBottom: space[12],
        backgroundColor: transparent ? "transparent" : color.background,
        borderBottomWidth: transparent ? 0 : 1,
        borderBottomColor: color.border,
        flexDirection: "row",
        alignItems: "center",
        gap: space[8],
      }}
    >
      {onBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t("common.back")} hitSlop={space[8]} onPress={onBack} style={{ width: 48, height: 48, alignItems: "flex-start", justifyContent: "center" }}>
          <Ionicons name="chevron-back" size={24} color={color.primaryText} />
        </Pressable>
      ) : (
        <View style={{ width: space[4] }} />
      )}
      <View style={{ flex: 1, gap: space[4] }}>
        {title ? (
          <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} numberOfLines={1} style={[font.h3, { color: color.primaryText }]}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} numberOfLines={1} style={[font.label, { color: color.secondaryText }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? <View style={{ width: 48 }} />}
    </View>
  );
}
