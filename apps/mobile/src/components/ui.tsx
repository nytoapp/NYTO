import { type ReactNode } from "react";
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
import { hitTarget, pageInset, radius, space, type as typeScale } from "./theme/tokens";
import { useTheme } from "./theme/ThemeProvider";

const weight: Record<keyof typeof typeScale, "400" | "500" | "600" | "700"> = {
  display: "700",
  title: "700",
  headline: "600",
  body: "400",
  label: "600",
  caption: "500",
};

export function AppText({
  children,
  role = "body",
  tone = "ink",
  numberOfLines,
}: {
  children: ReactNode;
  role?: keyof typeof typeScale;
  tone?: "ink" | "muted" | "accent" | "inverse" | "clay";
  numberOfLines?: number;
}) {
  const colors = useTheme();
  const color =
    tone === "muted" ? colors.muted : tone === "accent" ? colors.accent : tone === "inverse" ? colors.accentInk : tone === "clay" ? colors.clay : colors.ink;
  return (
    <Text
      allowFontScaling
      numberOfLines={numberOfLines}
      style={{ color, fontSize: typeScale[role], lineHeight: Math.round(typeScale[role] * 1.3), fontWeight: weight[role] }}
    >
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
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? colors.accent : colors.surface,
          borderColor: primary ? colors.accent : colors.line,
          opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
        },
      ]}
    >
      <AppText role="label" tone={primary ? "inverse" : "ink"}>
        {label}
      </AppText>
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
      style={({ pressed }) => [styles.icon, { backgroundColor: colors.surface, borderColor: colors.line, opacity: pressed ? 0.8 : 1 }]}
    >
      {glyph.length <= 2 ? <AppText role="label">{glyph}</AppText> : <Ionicons name="person-circle-outline" size={22} color={colors.ink} />}
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
          backgroundColor: selected ? colors.accent : colors.surface,
          borderColor: selected ? colors.accent : colors.line,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <AppText role="label" tone={selected ? "inverse" : "ink"}>
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
    <View accessibilityRole="tablist" style={[styles.segment, { backgroundColor: colors.accentSoft }]}>
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.id)}
            style={[styles.segmentItem, { backgroundColor: selected ? colors.surface : "transparent" }]}
          >
            <AppText role="caption" tone={selected ? "ink" : "muted"}>
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
  return (
    <View style={[styles.fieldWrap, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      {hideIcon ? null : <Ionicons name="search" size={18} color={colors.muted} />}
      <TextInput
        accessibilityLabel={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        secureTextEntry={secure}
        autoCapitalize={autoCapitalize ?? (secure ? "none" : "sentences")}
        autoCorrect={false}
        keyboardType={keyboardType}
        style={[styles.field, { color: colors.ink }]}
      />
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const colors = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line, shadowColor: colors.shadow }, style]}>{children}</View>
  );
}

export function ListRow({ title, meta, onPress }: { title: string; meta?: string; onPress?: () => void }) {
  const colors = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={[styles.row, { borderBottomColor: colors.line }]}>
      <AppText role="headline">{title}</AppText>
      {meta ? (
        <AppText role="caption" tone="muted">
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
      <Pressable accessibilityLabel="Close" style={[styles.scrim, { backgroundColor: colors.scrim }]} onPress={onClose} />
      <SafeAreaView edges={["bottom"]} style={[styles.sheet, { backgroundColor: colors.surface }]}>
        <View style={[styles.handle, { backgroundColor: colors.line }]} />
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
      <View style={[styles.dialogWrap, { backgroundColor: colors.scrim }]}>
        <View style={[styles.dialog, { backgroundColor: colors.surface }]}>
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
  return <View accessibilityLabel="Loading" style={[styles.skeleton, { height, width, backgroundColor: colors.line }]} />;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  const colors = useTheme();
  return (
    <View style={styles.block}>
      <View style={[styles.mark, { backgroundColor: colors.accentSoft }]}>
        <Ionicons name="sparkles-outline" size={22} color={colors.accent} />
      </View>
      <AppText role="headline">{title}</AppText>
      <AppText tone="muted">{body}</AppText>
      {action}
    </View>
  );
}

export function ErrorState({ title, body, onRetry }: { title: string; body: string; onRetry?: () => void }) {
  const colors = useTheme();
  return (
    <View style={[styles.notice, { backgroundColor: colors.dangerSurface }]}>
      <AppText role="headline">{title}</AppText>
      <AppText tone="muted">{body}</AppText>
      {onRetry ? <Button label="Try again" onPress={onRetry} /> : null}
    </View>
  );
}

export function ImageFrame({ label }: { label: string }) {
  const colors = useTheme();
  return (
    <View accessibilityLabel={label} style={[styles.image, { backgroundColor: colors.accent }]}>
      <AppText role="title" tone="inverse">
        {label.slice(0, 1).toUpperCase()}
      </AppText>
    </View>
  );
}

export function Attribution({ text }: { text: string }) {
  const colors = useTheme();
  return (
    <Text allowFontScaling accessibilityLabel={text} style={{ color: colors.muted, fontSize: 12, fontWeight: "500" }}>
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
    justifyContent: "center",
    paddingHorizontal: space[5],
    borderWidth: 1,
  },
  icon: {
    width: hitTarget,
    height: hitTarget,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  chip: {
    minHeight: 40,
    borderRadius: radius.pill,
    paddingHorizontal: space[4],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  segment: { flexDirection: "row", borderRadius: radius.pill, padding: 3 },
  segmentItem: { flex: 1, minHeight: 36, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  fieldWrap: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: space[4],
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
  },
  field: { flex: 1, fontSize: typeScale.body, paddingVertical: space[3] },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    padding: space[4],
    gap: space[2],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 2,
  },
  row: { paddingVertical: space[4], borderBottomWidth: StyleSheet.hairlineWidth, gap: space[1] },
  scrim: { flex: 1 },
  sheet: { padding: space[4], gap: space[3], borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center" },
  dialogWrap: { flex: 1, justifyContent: "center", padding: space[6] },
  dialog: { borderRadius: 20, padding: space[4], gap: space[3] },
  skeleton: { borderRadius: 16 },
  block: { gap: space[2], paddingVertical: space[6], alignItems: "flex-start" },
  mark: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  notice: { borderRadius: 20, padding: space[4], gap: space[2] },
  image: { height: 180, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
