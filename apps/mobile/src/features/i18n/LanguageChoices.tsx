import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { CityText } from "../city/chrome";
import { city } from "../city/theme";
import type { AppLanguage } from "../../i18n";
import { useLanguage } from "./language-store";

const choices: { code: AppLanguage; labelKey: "language.english" | "language.swedish" }[] = [
  { code: "en", labelKey: "language.english" },
  { code: "sv", labelKey: "language.swedish" },
];

export function LanguageChoices({ onChose }: { onChose?: () => void }) {
  const { t } = useTranslation();
  const language = useLanguage((state) => state.language);
  const setLanguage = useLanguage((state) => state.setLanguage);

  return (
    <View style={styles.list}>
      {choices.map((choice) => {
        const selected = language === choice.code;
        return (
          <Pressable
            key={choice.code}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={t(choice.labelKey)}
            onPress={() => {
              void setLanguage(choice.code).then(() => onChose?.());
            }}
            style={({ pressed }) => [styles.row, selected && styles.rowOn, pressed && styles.pressed]}
          >
            <CityText style={styles.label}>{t(choice.labelKey)}</CityText>
            {selected ? <Ionicons name="checkmark" size={18} color={city.ink} /> : null}
          </Pressable>
        );
      })}
      <CityText size="meta" tone="muted" style={styles.note}>
        {t("language.names")}
      </CityText>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 4 },
  row: { minHeight: 52, borderRadius: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  rowOn: { backgroundColor: city.chip },
  label: { flex: 1 },
  note: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4 },
  pressed: { opacity: 0.9 },
});
