import { type ReactNode } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { hitTarget, pageInset, radius, space, type as typeScale } from "./theme/tokens";
import { useTheme } from "./theme/ThemeProvider";

export function AppText({
  children,
  role = "body",
  tone = "ink",
}: {
  children: ReactNode;
  role?: keyof typeof typeScale;
  tone?: "ink" | "muted" | "accent" | "inverse";
}) {
  const colors = useTheme();
  const color = tone === "muted" ? colors.muted : tone === "accent" ? colors.accent : tone === "inverse" ? colors.accentInk : colors.ink;
  return (
    <Text allowFontScaling style={{ color, fontSize: typeScale[role], lineHeight: typeScale[role] * 1.35 }}>
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
          backgroundColor: primary ? colors.accent : "transparent",
          borderColor: colors.line,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
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
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.icon, { borderColor: colors.line }]}>
      <AppText role="label">{glyph}</AppText>
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
      style={[styles.chip, { backgroundColor: selected ? colors.accent : colors.surface, borderColor: colors.line }]}
    >
      <AppText role="caption" tone={selected ? "inverse" : "ink"}>
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
    <View accessibilityRole="tablist" style={[styles.segment, { borderColor: colors.line }]}>
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.id)}
            style={[styles.segmentItem, { backgroundColor: selected ? colors.accent : "transparent" }]}
          >
            <AppText role="caption" tone={selected ? "inverse" : "ink"}>
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
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  onSubmit?: () => void;
  secure?: boolean;
}) {
  const colors = useTheme();
  return (
    <TextInput
      accessibilityLabel={placeholder}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      returnKeyType="search"
      onSubmitEditing={onSubmit}
      secureTextEntry={secure}
      style={[styles.field, { color: colors.ink, backgroundColor: colors.surface, borderColor: colors.line }]}
    />
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const colors = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }, style]}>{children}</View>;
}

export function ListRow({ title, meta, onPress }: { title: string; meta?: string; onPress?: () => void }) {
  const colors = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={[styles.row, { borderBottomColor: colors.line }]}>
      <AppText role="headline">{title}</AppText>
      {meta ? <AppText role="caption" tone="muted">{meta}</AppText> : null}
    </Pressable>
  );
}

export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const colors = useTheme();
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close sheet" style={[styles.scrim, { backgroundColor: colors.scrim }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>{children}</View>
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

export function Skeleton({ height = 72 }: { height?: number }) {
  const colors = useTheme();
  return <View accessibilityLabel="Loading" style={[styles.skeleton, { height, backgroundColor: colors.line }]} />;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.block}>
      <AppText role="headline">{title}</AppText>
      <AppText tone="muted">{body}</AppText>
    </View>
  );
}

export function ErrorState({ title, body, onRetry }: { title: string; body: string; onRetry?: () => void }) {
  const colors = useTheme();
  return (
    <View style={[styles.block, { backgroundColor: colors.dangerSurface, borderRadius: radius.md, padding: space[4] }]}>
      <AppText role="headline">{title}</AppText>
      <AppText tone="muted">{body}</AppText>
      {onRetry ? <Button label="Try again" onPress={onRetry} /> : null}
    </View>
  );
}

export function ImageFrame({ label }: { label: string }) {
  const colors = useTheme();
  return (
    <View accessibilityLabel={label} style={[styles.image, { backgroundColor: colors.line }]}>
      <AppText role="caption" tone="muted">{label}</AppText>
    </View>
  );
}

export function Attribution({ text }: { text: string }) {
  const colors = useTheme();
  return (
    <Text allowFontScaling accessibilityLabel={text} style={{ color: colors.muted, fontSize: 12, fontWeight: "400" }}>
      {text}
    </Text>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  const colors = useTheme();
  return <View style={[styles.screen, { backgroundColor: colors.background }]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: pageInset, paddingTop: space[4] },
  button: { minHeight: hitTarget, borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: space[4], borderWidth: 1 },
  icon: { minWidth: hitTarget, minHeight: hitTarget, borderRadius: radius.md, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  chip: { minHeight: 36, borderRadius: radius.pill, paddingHorizontal: space[3], alignItems: "center", justifyContent: "center", borderWidth: 1 },
  segment: { flexDirection: "row", borderWidth: 1, borderRadius: radius.md, overflow: "hidden" },
  segmentItem: { flex: 1, minHeight: hitTarget, alignItems: "center", justifyContent: "center" },
  field: { minHeight: hitTarget, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space[3], fontSize: typeScale.body },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: space[4], gap: space[2] },
  row: { paddingVertical: space[4], borderBottomWidth: StyleSheet.hairlineWidth, gap: space[1] },
  scrim: { flex: 1 },
  sheet: { padding: space[4], gap: space[3], borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  dialogWrap: { flex: 1, justifyContent: "center", padding: space[6] },
  dialog: { borderRadius: radius.lg, padding: space[4], gap: space[3] },
  skeleton: { borderRadius: radius.md, width: "100%" },
  block: { gap: space[2], paddingVertical: space[6] },
  image: { height: 140, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
});
