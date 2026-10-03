import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, type StyleProp, type ViewStyle } from "react-native";
import { color, font, fontScaleCap, motion, radius, space } from "./theme";

const hit = 48;

function pressStyle(pressed: boolean, disabled: boolean | undefined, base: StyleProp<ViewStyle>) {
  return [base, { transform: [{ scale: pressed && !disabled ? motion.pressScale : 1 }] }];
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) =>
        pressStyle(pressed, disabled, {
          minHeight: hit,
          borderRadius: radius.pill,
          backgroundColor: disabled ? color.accentSoft : color.accent,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: space[20],
        })
      }
    >
      <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.button, { color: disabled ? color.mutedText : color.onAccent }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) =>
        pressStyle(pressed, disabled, {
          minHeight: hit,
          borderRadius: radius.pill,
          backgroundColor: color.surface,
          borderWidth: 1,
          borderColor: disabled ? color.border : color.accent,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: space[20],
        })
      }
    >
      <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.button, { color: disabled ? color.mutedText : color.primaryText }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) =>
        pressStyle(pressed, disabled, {
          minHeight: hit,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: space[12],
          opacity: pressed && !disabled ? 0.7 : 1,
        })
      }
    >
      <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} style={[font.button, { color: disabled ? color.mutedText : color.secondaryText }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function IconButton({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={space[8]}
      onPress={onPress}
      style={({ pressed }) =>
        pressStyle(pressed, disabled, {
          width: hit,
          height: hit,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.4 : 1,
        })
      }
    >
      <Ionicons name={icon} size={22} color={disabled ? color.mutedText : color.primaryText} />
    </Pressable>
  );
}
