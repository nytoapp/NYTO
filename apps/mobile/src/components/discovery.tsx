import type { SearchResult } from "@atlas/contracts";
import { Ionicons } from "@expo/vector-icons";
import { type ReactNode, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { color } from "../features/city/theme";
import { radius, space } from "./theme/tokens";
import { useTheme } from "./theme/ThemeProvider";
import { AppText, Attribution, Skeleton } from "./ui";

export function kindLabel(kind: string): string {
  if (kind === "accommodation") return "Stay";
  if (kind === "place") return "Place";
  if (kind === "event") return "Event";
  return kind.slice(0, 1).toUpperCase() + kind.slice(1);
}

function wash(): string {
  return color.imagePlaceholder;
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHead}>
      <AppText role="headline">{title}</AppText>
      {action && onAction ? (
        <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onAction} hitSlop={8}>
          <AppText role="label" tone="accent">
            {action}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ArtPlate({ title, kind, height, caption }: { title: string; kind: string; height: number; caption?: string }) {
  return (
    <View accessibilityLabel={title} style={[styles.plate, { height, backgroundColor: wash() }]}>
      <View style={styles.glow} />
      <View style={styles.plateCopy}>
        {caption ? (
          <AppText role="caption" tone="inverse">
            {caption}
          </AppText>
        ) : (
          <AppText role="caption" tone="inverse">
            {kindLabel(kind)}
          </AppText>
        )}
      </View>
    </View>
  );
}

function Cover({ uri, title, height, label }: { uri: string | null; title: string; height: number; label?: string }) {
  const colors = useTheme();
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return (
      <View style={{ height, backgroundColor: colors.elevatedSurface, justifyContent: "flex-end", padding: space[3] }}>
        <AppText role="caption" tone="tertiary">
          {label ?? kindLabel("place")}
        </AppText>
      </View>
    );
  }
  return <Image accessibilityLabel={title} source={{ uri }} style={{ height, width: "100%" }} resizeMode="cover" onError={() => setFailed(true)} />;
}

export function FeaturedPlaceCard({
  item,
  reason,
  onPress,
}: {
  item: SearchResult;
  reason?: string;
  onPress?: () => void;
}) {
  const colors = useTheme();
  const image = item.images?.[0]?.url ?? null;
  const kicker = reason ?? item.category ?? kindLabel(item.kind);
  if (!image) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={onPress} style={styles.editorial}>
        <View style={[styles.rule, { backgroundColor: colors.accent }]} />
        <AppText role="caption" tone="tertiary">
          {kicker}
        </AppText>
        <AppText role="headlineLarge" numberOfLines={3}>
          {item.title}
        </AppText>
        <AppText role="bodySmall" tone="muted">
          {metaLine(item)}
        </AppText>
      </Pressable>
    );
  }
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={onPress} style={styles.heroPress}>
      <View style={[styles.hero, { backgroundColor: colors.elevatedSurface }]}>
        <Cover uri={image} title={item.title} height={300} label={kicker} />
        <View style={styles.scrim} />
        <View style={styles.heroCopy}>
          <AppText role="caption" tone="inverse">
            {kicker}
          </AppText>
          <AppText role="headlineMedium" tone="inverse" numberOfLines={2}>
            {item.title}
          </AppText>
          <AppText role="caption" tone="inverse">
            {metaLine(item)}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

export function PlaceCard({ item, onPress }: { item: SearchResult; onPress?: () => void }) {
  const colors = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={onPress} style={[styles.place, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={[styles.placeImage, { backgroundColor: colors.elevatedSurface }]}>
        <Cover uri={item.images?.[0]?.url ?? null} title={item.title} height={112} label={item.category ?? kindLabel(item.kind)} />
      </View>
      <View style={styles.placeCopy}>
        <AppText role="label" numberOfLines={2}>
          {item.title}
        </AppText>
        <AppText role="caption" tone="muted" numberOfLines={1}>
          {metaLine(item)}
        </AppText>
      </View>
    </Pressable>
  );
}

export function SearchResultCard({ item, onPress }: { item: SearchResult; onPress?: () => void }) {
  const colors = useTheme();
  const source = item.attribution[0]?.text ?? (item.factSource === "provider" && item.provider ? item.provider : null);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={onPress} style={[styles.result, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={{ backgroundColor: colors.elevatedSurface }}>
        <Cover uri={item.images?.[0]?.url ?? null} title={item.title} height={168} label={item.category ?? kindLabel(item.kind)} />
      </View>
      <View style={styles.resultCopy}>
        <AppText role="headline" numberOfLines={2}>
          {item.title}
        </AppText>
        <AppText role="caption" tone="muted" numberOfLines={1}>
          {metaLine(item)}
        </AppText>
        {secondaryLine(item) ? (
          <AppText role="caption" tone="muted" numberOfLines={1}>
            {secondaryLine(item)}
          </AppText>
        ) : null}
        {item.tags?.[0] ? (
          <AppText role="caption" tone="muted" numberOfLines={1}>
            {item.tags[0]}
          </AppText>
        ) : null}
        {source ? <Attribution text={source} /> : null}
      </View>
    </Pressable>
  );
}

export function EventCard({ item, onPress }: { item: SearchResult; onPress?: () => void }) {
  return <PlaceCard item={item} onPress={onPress} />;
}

export function MoodRail({
  items,
  onPress,
}: {
  items: { id: string; label: string; icon: keyof typeof Ionicons.glyphMap }[];
  onPress: (id: string) => void;
}) {
  const colors = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
      {items.map((item) => (
        <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => onPress(item.id)} style={styles.mood}>
          <View style={[styles.moodMark, { borderColor: colors.border }]}>
            <Ionicons name={item.icon} size={18} color={colors.primaryText} />
          </View>
          <AppText role="caption">{item.label}</AppText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function CategoryCard({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.category, { backgroundColor: colors.surface, borderColor: colors.line }]}
    >
      <AppText role="label">{label}</AppText>
    </Pressable>
  );
}

export function DestinationChip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.destination, { backgroundColor: "transparent", borderColor: selected ? colors.accent : colors.border }]}
    >
      <Ionicons name={label === "Nearby" ? "navigate-outline" : "location-outline"} size={14} color={selected ? colors.accent : colors.secondaryText} />
      <AppText role="label" tone={selected ? "accent" : "ink"}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function CollectionCard({ title }: { title: string }) {
  const colors = useTheme();
  return (
    <View style={[styles.collection, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <AppText role="label" numberOfLines={2}>
        {title}
      </AppText>
    </View>
  );
}

export function TripCard({ title, destination, dates, onPress }: { title: string; destination: string; dates: string; onPress?: () => void }) {
  const colors = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={[styles.trip, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <AppText role="caption" tone="muted">
        {dates}
      </AppText>
      <AppText role="headline" numberOfLines={1}>
        {title}
      </AppText>
      <AppText role="caption" tone="muted">
        {destination}
      </AppText>
    </Pressable>
  );
}

export function Rail({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
      {children}
    </ScrollView>
  );
}

export function CardSkeleton({ width = 168, height = 196 }: { width?: number; height?: number }) {
  return (
    <View style={{ width, gap: space[2] }}>
      <Skeleton height={height - 52} width={width} />
      <Skeleton height={14} width={Math.round(width * 0.72)} />
      <Skeleton height={12} width={Math.round(width * 0.4)} />
    </View>
  );
}

function metaLine(item: SearchResult): string {
  if (item.kind === "event") {
    return [formatWhen(item.startsAt), item.locality, item.category].filter((part): part is string => Boolean(part)).join(" · ") || kindLabel(item.kind);
  }
  const parts = [item.category ?? kindLabel(item.kind)];
  if (item.locality) {
    parts.push(item.locality);
  }
  if (item.distanceMeters !== null) {
    parts.push(item.distanceMeters < 1000 ? `${Math.round(item.distanceMeters)} m` : `${(item.distanceMeters / 1000).toFixed(1)} km`);
  }
  return parts.join(" · ");
}

function secondaryLine(item: SearchResult): string | null {
  const parts: string[] = [];
  if (item.rating !== null) {
    parts.push(item.rating.toFixed(1));
  }
  if (item.reviewCount !== null) {
    parts.push(`${item.reviewCount} reviews`);
  }
  const price = formatPrice(item.price);
  if (price) {
    parts.push(price);
  }
  if (item.reasons?.[0]) {
    parts.push(item.reasons[0]);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function formatPrice(price: SearchResult["price"]): string | null {
  if (!price) {
    return null;
  }
  const exponent = price.currency === "JPY" || price.currency === "KRW" || price.currency === "VND" ? 0 : 2;
  const major = exponent === 0 ? String(price.amountMinor) : (price.amountMinor / 100).toFixed(0);
  const basis = price.basis === "per_person" ? " / person" : price.basis === "per_night" ? " / night" : "";
  return `${price.currency} ${major}${basis}`;
}

function formatWhen(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

const styles = StyleSheet.create({
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: space[3] },
  plate: { justifyContent: "flex-end", padding: space[4] },
  glow: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255, 255, 255, 0.04)", top: -40, right: -30 },
  glowSmall: { position: "absolute", width: 70, height: 70, borderRadius: 35, backgroundColor: "rgba(255, 255, 255, 0.05)", top: -16, right: -10 },
  plateCopy: { gap: 2 },
  editorial: { gap: space[2], paddingVertical: space[2] },
  rule: { width: 28, height: 2, borderRadius: 1, marginBottom: space[1] },
  heroPress: { borderRadius: radius.large },
  hero: { height: 300, borderRadius: radius.large, justifyContent: "flex-end", overflow: "hidden" },
  heroCopy: { position: "absolute", left: space[5], right: space[5], bottom: space[5], gap: 6 },
  scrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: 160, backgroundColor: color.overlay },
  place: { width: 168, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  placeImage: { height: 112 },
  placeCopy: { padding: space[3], gap: 4 },
  result: { borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  resultCopy: { padding: space[4], gap: 4 },
  category: { minHeight: 40, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: space[4], alignItems: "center", justifyContent: "center" },
  destination: { minHeight: 40, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: space[3], flexDirection: "row", alignItems: "center", gap: 6 },
  collection: { width: 148, minHeight: 88, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: space[4], justifyContent: "flex-end" },
  trip: { borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, padding: space[4], gap: 4 },
  rail: { gap: space[2], paddingRight: space[2] },
  mood: { width: 68, alignItems: "center", gap: 8 },
  moodMark: { width: 48, height: 48, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
});
