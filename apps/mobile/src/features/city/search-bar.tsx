import { Ionicons } from "@expo/vector-icons";
import { useState, type ReactNode } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import { color, font, fontScaleCap, radius, space } from "./theme";

export function SearchBar({
  value,
  onChangeText,
  placeholder,
  onSubmit,
  onPress,
  editable = true,
  autoFocus,
  accessibilityLabel,
  leading,
  trailing,
  returnKeyType = "search",
  autoCapitalize = "sentences",
}: {
  value: string;
  onChangeText?: (value: string) => void;
  placeholder: string;
  onSubmit?: () => void;
  onPress?: () => void;
  editable?: boolean;
  autoFocus?: boolean;
  accessibilityLabel?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  returnKeyType?: TextInputProps["returnKeyType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
}) {
  const label = accessibilityLabel ?? placeholder;
  const showClear = editable && value.length > 0;
  const [focused, setFocused] = useState(false);

  const field = (
    <View
      style={{
        minHeight: 48,
        borderRadius: radius.large,
        backgroundColor: focused ? color.accentSoft : color.surface,
        borderWidth: 1,
        borderColor: focused ? color.primaryText : color.border,
        flexDirection: "row",
        alignItems: "center",
        gap: space[8],
        paddingHorizontal: space[16],
      }}
    >
      {leading ?? <Ionicons name="search-outline" size={18} color={color.mutedText} />}
      {editable ? (
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={color.mutedText}
          autoFocus={autoFocus}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmit}
          style={[font.body, { flex: 1, color: color.primaryText, paddingVertical: 0 }]}
        />
      ) : (
        <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} numberOfLines={1} style={[font.body, { flex: 1, color: value ? color.primaryText : color.mutedText }]}>
          {value || placeholder}
        </Text>
      )}
      {showClear ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={space[8]} onPress={() => onChangeText?.("")}>
          <Ionicons name="close" size={18} color={color.secondaryText} />
        </Pressable>
      ) : null}
      {trailing}
    </View>
  );

  if (!editable && onPress) {
    return (
      <Pressable accessibilityRole="search" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}>
        {field}
      </Pressable>
    );
  }

  return field;
}
