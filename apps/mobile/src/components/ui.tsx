import { type ReactNode, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { hitTarget, pageInset, radius, space, type, typeStyle } from "./theme/tokens";
import { useTheme } from "./theme/ThemeProvider";

export function AppText({
  children,
  role = "body",
  tone = "ink",
  numberOfLines,
}: {
  children: ReactNode;
  role?: keyof typeof type;
  tone?: "ink" | "muted" | "accent" | "inverse" | "clay" | "onPaper" | "tertiary";
  numberOfLines?: number;
}) {
  const colors = useTheme();
  const color =
    tone === "muted"
      ? colors.secondaryText
      : tone === "tertiary"
        ? colors.tertiaryText
        : tone === "accent"
          ? colors.accent
          : tone === "inverse"
            ? colors.primaryText
            : tone === "onPaper"
              ? colors.paperInk
              : tone === "clay"
                ? colors.error
                : colors.primaryText;
  return (
    <Text allowFontScaling numberOfLines={numberOfLines} style={[typeStyle(role), { color }]}>
      {children}
    </Text>
  );
}

export function Button({
  label,
  onPress,
  disabled,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  const colors = useTheme();
  const primary = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: disabled ? colors.surfacePressed : primary ? colors.paper : "transparent",
          borderColor: disabled ? colors.border : primary ? colors.paper : colors.border,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
      ]}
    >
      <Text
        allowFontScaling
        style={[
          typeStyle("label"),
          { color: disabled ? colors.tertiaryText : primary ? colors.paperInk : colors.primaryText },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function IconButton({ label, onPress, glyph }: { label: string; onPress: () => void; glyph: string }) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.icon, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
    >
      {glyph.length <= 2 ? <AppText role="label">{glyph}</AppText> : <Ionicons name="person-outline" size={20} color={colors.primaryText} />}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.surfaceSelected : "transparent",
          borderColor: selected ? colors.accent : colors.border,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <AppText role="label" tone={selected ? "accent" : "ink"}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const colors = useTheme();
  return (
    <View accessibilityRole="tablist" style={[styles.segment, { backgroundColor: colors.surface }]}>
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.id)}
            style={[styles.segmentItem, { backgroundColor: selected ? colors.elevatedSurface : "transparent" }]}
          >
            <AppText role="caption" tone={selected ? "ink" : "tertiary"}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder,
  onSubmit,
  secure,
  hideIcon,
  autoCapitalize,
  keyboardType,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  onSubmit?: () => void;
  secure?: boolean;
  hideIcon?: boolean;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  keyboardType?: TextInputProps["keyboardType"];
}) {
  const colors = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  return (
    <View
      style={[
        styles.fieldWrap,
        {
          backgroundColor: focused ? colors.surfaceSelected : colors.surface,
          borderColor: focused ? colors.primaryText : colors.border,
        },
      ]}
    >
      {hideIcon ? null : <Ionicons name="search-outline" size={18} color={focused ? colors.primaryText : colors.tertiaryText} />}
      <TextInput
        accessibilityLabel={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.tertiaryText}
        returnKeyType={secure ? "done" : "search"}
        onSubmitEditing={onSubmit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        secureTextEntry={secure ? hidden : false}
        autoCapitalize={autoCapitalize ?? (secure ? "none" : "sentences")}
        autoCorrect={false}
        keyboardType={keyboardType}
        style={[styles.field, typeStyle("body"), { color: colors.primaryText }]}
      />
      {secure ? (
        <Pressable accessibilityRole="button" accessibilityLabel={hidden ? "Show password" : "Hide password"} onPress={() => setHidden((current) => !current)} hitSlop={8}>
          <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={18} color={colors.secondaryText} />
        </Pressable>
      ) : value.length > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear" onPress={() => onChangeText("")} hitSlop={8}>
          <Ionicons name="close" size={16} color={colors.secondaryText} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const colors = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.divider }, style]}>{children}</View>;
}

export function ListRow({ title, meta, onPress }: { title: string; meta?: string; onPress?: () => void }) {
  const colors = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={[styles.row, { borderBottomColor: colors.divider }]}>
      <AppText role="bodyLarge">{title}</AppText>
      {meta ? (
        <AppText role="caption" tone="tertiary">
          {meta}
        </AppText>
      ) : null}
    </Pressable>
  );
}

export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const colors = useTheme();
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" style={[styles.scrim, { backgroundColor: colors.overlay }]} onPress={onClose} />
      <SafeAreaView edges={["bottom"]} style={[styles.sheet, { backgroundColor: colors.elevatedSurface }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        {children}
      </SafeAreaView>
    </Modal>
  );
}

export function Dialog({
  visible,
  title,
  body,
  onClose,
}: {
  visible: boolean;
  title: string;
  body: string;
  onClose: () => void;
}) {
  const colors = useTheme();
  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="fade">
      <View style={[styles.dialogWrap, { backgroundColor: colors.overlay }]}>
        <View style={[styles.dialog, { backgroundColor: colors.elevatedSurface }]}>
          <AppText role="headline">{title}</AppText>
          <AppText tone="muted">{body}</AppText>
          <Button label="Close" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

export function Skeleton({ height = 72, width = "100%" }: { height?: number; width?: number | `${number}%` }) {
  const colors = useTheme();
  return <View accessibilityLabel="Loading" style={[styles.skeleton, { height, width, backgroundColor: colors.elevatedSurface }]} />;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  const colors = useTheme();
  return (
    <View style={styles.block}>
      <View style={[styles.rule, { backgroundColor: colors.accent }]} />
      <AppText role="headlineMedium">{title}</AppText>
      <AppText tone="muted">{body}</AppText>
      {action}
    </View>
  );
}

export function ErrorState({ title, body, onRetry }: { title: string; body: string; onRetry?: () => void }) {
  const colors = useTheme();
  return (
    <View style={styles.block}>
      <View style={[styles.rule, { backgroundColor: colors.accent }]} />
      <AppText role="headline">{title}</AppText>
      <AppText tone="muted">{body}</AppText>
      {onRetry ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Try again" onPress={onRetry} style={styles.retry}>
          <AppText role="label" tone="accent">
            Try again
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ImageFrame({ label }: { label: string }) {
  const colors = useTheme();
  return (
    <View accessibilityLabel={label} style={[styles.image, { backgroundColor: colors.elevatedSurface }]}>
      <AppText role="title">{label.slice(0, 1).toUpperCase()}</AppText>
    </View>
  );
}

export function Attribution({ text }: { text: string }) {
  const colors = useTheme();
  return (
    <Text allowFontScaling accessibilityLabel={text} style={[typeStyle("caption"), { color: colors.tertiaryText }]}>
      {text}
    </Text>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  const colors = useTheme();
  return (
    <SafeAreaView edges={["top"]} style={[styles.screen, { backgroundColor: colors.background }]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: pageInset },
  button: {
    minHeight: hitTarget,
    borderRadius: radius.pill,
    alignItems: "center",
    alignSelf: "stretch",
    justifyContent: "center",
    paddingHorizontal: space.xl,
    borderWidth: 1,
  },
  icon: {
    width: hitTarget,
    height: hitTarget,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  chip: {
    minHeight: 40,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  segment: { flexDirection: "row", borderRadius: radius.pill, padding: 3 },
  segmentItem: { flex: 1, minHeight: 36, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  fieldWrap: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: radius.medium,
    paddingHorizontal: space.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  field: { flex: 1, paddingVertical: space.md },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.sm,
  },
  row: { minHeight: 52, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, justifyContent: "center", gap: 2 },
  scrim: { flex: 1 },
  sheet: { padding: space.lg, gap: space.md, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  handle: { width: 36, height: 3, borderRadius: 2, alignSelf: "center", marginBottom: space.sm },
  dialogWrap: { flex: 1, justifyContent: "center", padding: space.xl },
  dialog: { borderRadius: radius.card, padding: space.lg, gap: space.md },
  skeleton: { borderRadius: radius.medium },
  block: { gap: space.sm, paddingVertical: space.lg, alignItems: "stretch", width: "100%" },
  rule: { width: 28, height: 2, borderRadius: 1, marginBottom: space.xs },
  retry: { minHeight: 44, justifyContent: "center" },
  image: { height: 180, borderRadius: radius.card, alignItems: "flex-start", justifyContent: "flex-end", padding: space.lg },
});
