import { Pressable, Text } from "react-native";
import { color, font, fontScaleCap, motion, radius, space } from "./theme";

export type ChipVariant = "category" | "filter" | "selection" | "compact";

export function CityChip({
  label,
  variant = "category",
  selected = false,
  disabled = false,
  onPress,
}: {
  label: string;
  variant?: ChipVariant;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const compact = variant === "compact";
  const filled = selected && (variant === "category" || variant === "selection");
  const filterOn = selected && variant === "filter";
  const background = filled || filterOn ? color.accent : variant === "filter" ? color.surface : color.accentSoft;
  const text = filled || filterOn ? color.onAccent : color.primaryText;
  const minHeight = compact ? 32 : variant === "selection" ? 44 : 36;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight,
        borderRadius: radius.pill,
        paddingHorizontal: compact ? space[12] : space[16],
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: background,
        borderWidth: variant === "filter" && !selected ? 1 : 0,
        borderColor: color.border,
        opacity: disabled ? 0.4 : 1,
        transform: [{ scale: pressed && !disabled ? motion.pressScale : 1 }],
      })}
    >
      <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[compact ? font.caption : font.label, { color: text }]}>
        {label}
      </Text>
    </Pressable>
  );
}
