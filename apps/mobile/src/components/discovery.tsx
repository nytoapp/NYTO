import type { SearchResult } from "@atlas/contracts";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { radius, space } from "./theme/tokens";
import { useTheme } from "./theme/ThemeProvider";
import { AppText, Attribution, Skeleton } from "./ui";

const plates = {
  place: "#1E4638",
  accommodation: "#3C4C6E",
  event: "#8C3E2F",
  experience: "#3E5C46",
  activity: "#2C5C56",
  media: "#4C415C",
} as const;

export function kindLabel(kind: string): string {
  if (kind === "accommodation") return "Stay";
  if (kind === "place") return "Place";
  return kind.slice(0, 1).toUpperCase() + kind.slice(1);
}

function plateColor(kind: string): string {
  return kind in plates ? plates[kind as keyof typeof plates] : plates.place;
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

export function ArtPlate({ title, kind, height }: { title: string; kind: string; height: number }) {
  const letter = title.trim().slice(0, 1).toUpperCase() || "N";
  return (
    <View accessibilityLabel={title} style={[styles.plate, { height, backgroundColor: plateColor(kind) }]}>
      <View style={styles.orb} />
      <AppText role="display" tone="inverse">
        {letter}
      </AppText>
      <AppText role="caption" tone="inverse">
        {kindLabel(kind)}
      </AppText>
    </View>
  );
}

export function FeaturedPlaceCard({ item, onPress }: { item: SearchResult; onPress?: () => void }) {
  const colors = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={onPress} style={[styles.featured, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <ArtPlate title={item.title} kind={item.kind} height={188} />
      <View style={styles.copy}>
        <AppText role="title" numberOfLines={2}>
          {item.title}
        </AppText>
        <Meta item={item} />
      </View>
    </Pressable>
  );
}

export function PlaceCard({ item, onPress }: { item: SearchResult; onPress?: () => void }) {
  const colors = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={onPress} style={[styles.place, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <ArtPlate title={item.title} kind={item.kind} height={112} />
      <View style={styles.copyTight}>
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
      <ArtPlate title={item.title} kind={item.kind} height={132} />
      <View style={styles.copy}>
        <AppText role="headline" numberOfLines={2}>
          {item.title}
        </AppText>
        {item.summary ? (
          <AppText role="caption" tone="muted" numberOfLines={2}>
            {item.summary}
          </AppText>
        ) : null}
        <Meta item={item} />
        {source ? <Attribution text={source} /> : null}
      </View>
    </Pressable>
  );
}

export function EventCard({ item, onPress }: { item: SearchResult; onPress?: () => void }) {
  return <PlaceCard item={item} onPress={onPress} />;
}

export function CategoryCard({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.category, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={[styles.categoryMark, { backgroundColor: colors.claySoft }]}>
        <Ionicons name="compass-outline" size={18} color={colors.clay} />
      </View>
      <AppText role="label" numberOfLines={2}>
        {label}
      </AppText>
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
      style={[styles.destination, { backgroundColor: selected ? colors.accent : colors.surface, borderColor: selected ? colors.accent : colors.line }]}
    >
      <Ionicons name={label === "Nearby" ? "navigate-outline" : "location-outline"} size={14} color={selected ? colors.accentInk : colors.ink} />
      <AppText role="label" tone={selected ? "inverse" : "ink"}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function CollectionCard({ title }: { title: string }) {
  const colors = useTheme();
  return (
    <View style={[styles.collection, { backgroundColor: colors.accentSoft }]}>
      <Ionicons name="folder-outline" size={18} color={colors.accent} />
      <AppText role="label" numberOfLines={2}>
        {title}
      </AppText>
    </View>
  );
}

export function TripCard({ title, destination, dates }: { title: string; destination: string; dates: string }) {
  const colors = useTheme();
  return (
    <View style={[styles.trip, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={[styles.tripBand, { backgroundColor: colors.accent }]} />
      <View style={styles.copy}>
        <AppText role="headline" numberOfLines={1}>
          {title}
        </AppText>
        <AppText role="caption" tone="muted">
          {destination}
        </AppText>
        <AppText role="label">{dates}</AppText>
      </View>
    </View>
  );
}

export function Rail({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
      {children}
    </ScrollView>
  );
}

export function CardSkeleton({ width = 168, height = 210 }: { width?: number; height?: number }) {
  return (
    <View style={{ width, gap: space[2] }}>
      <Skeleton height={height - 58} width={width} />
      <Skeleton height={14} width={width * 0.7} />
      <Skeleton height={12} width={width * 0.4} />
    </View>
  );
}

function Meta({ item }: { item: SearchResult }) {
  return (
    <AppText role="caption" tone="muted" numberOfLines={1}>
      {metaLine(item)}
    </AppText>
  );
}

function metaLine(item: SearchResult): string {
  const parts = [kindLabel(item.kind)];
  if (item.distanceMeters !== null) {
    parts.push(item.distanceMeters < 1000 ? `${Math.round(item.distanceMeters)} m` : `${(item.distanceMeters / 1000).toFixed(1)} km`);
  }
  return parts.join(" · ");
}

const styles = StyleSheet.create({
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: space[3] },
  plate: { borderRadius: 18, overflow: "hidden", justifyContent: "flex-end", padding: space[3] },
  orb: { position: "absolute", width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.12)", top: -28, right: -20 },
  featured: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  place: { width: 168, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  result: { borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  category: { width: 112, minHeight: 104, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: space[3], justifyContent: "space-between" },
  categoryMark: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  destination: { minHeight: 40, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: space[3], flexDirection: "row", alignItems: "center", gap: 6 },
  collection: { width: 148, minHeight: 92, borderRadius: 18, padding: space[3], justifyContent: "space-between" },
  trip: { borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  tripBand: { height: 8 },
  copy: { padding: space[4], gap: 4 },
  copyTight: { padding: space[3], gap: 4 },
  rail: { gap: space[3], paddingRight: space[4] },
});
