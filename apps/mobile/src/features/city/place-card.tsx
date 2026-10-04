import type { SearchResult } from "@atlas/contracts";
import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { categoryArt } from "./category-art";
import { formatDistance, formatPrice, kindLabel } from "./format";
import { CityImage } from "./image";
import { color, font, fontScaleCap, motion, radius, space } from "./theme";

export type PlaceCardModel = {
  id: string;
  title: string;
  category: string | null;
  locality: string | null;
  distanceLabel: string | null;
  priceLabel: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  meta: string | null;
};

export function placeCardFromResult(item: SearchResult): PlaceCardModel {
  return {
    id: item.id,
    title: item.title,
    category: item.category ?? kindLabel(item.kind),
    locality: item.locality,
    distanceLabel: formatDistance(item.distanceMeters),
    priceLabel: formatPrice(item.price),
    imageUrl: item.images?.[0]?.url ?? null,
    imageAlt: item.images?.[0]?.alt ?? item.title,
    meta: item.summary,
  };
}

export function CategoryCover({ label, seed, style }: { label: string | null; seed?: string; style?: StyleProp<ViewStyle> }) {
  const offset = seed ? coverShift(seed) : 0;
  return (
    <View style={[style, { overflow: "hidden" }]}>
      <Image
        accessibilityIgnoresInvertColors
        source={categoryArt(label)}
        resizeMode="cover"
        style={{ width: "140%", height: "140%", transform: [{ translateX: offset }, { translateY: -offset }] }}
      />
    </View>
  );
}

function coverShift(seed: string): number {
  let hash = 0;
  for (const char of seed) hash = (hash + char.charCodeAt(0) * 13) % 36;
  return 8 - hash;
}

function SaveMark({ saved, onSave }: { saved: boolean; onSave: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? "Saved" : "Save"}
      accessibilityState={{ selected: saved }}
      hitSlop={space[8]}
      onPress={onSave}
      style={{
        width: 36,
        height: 36,
        borderRadius: radius.pill,
        backgroundColor: color.surface,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={saved ? "heart" : "heart-outline"} size={18} color={saved ? color.error : color.primaryText} />
    </Pressable>
  );
}

function facts(place: PlaceCardModel): string {
  return [place.locality, place.distanceLabel, place.priceLabel].filter(Boolean).join(" · ");
}

export function LargePlaceCard({
  place,
  onPress,
  saved = false,
  onSave,
}: {
  place: PlaceCardModel;
  onPress?: () => void;
  saved?: boolean;
  onSave?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={place.title}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({ gap: space[8], transform: [{ scale: pressed && onPress ? motion.pressScale : 1 }] })}
    >
      <View style={{ height: 148, borderRadius: radius.image, overflow: "hidden", backgroundColor: color.accentSoft }}>
        {place.imageUrl ? (
          <CityImage uri={place.imageUrl} alt={place.imageAlt ?? place.title} style={{ width: "100%", height: 148 }} />
        ) : (
          <CategoryCover label={place.category} seed={place.title} style={{ width: "100%", height: 148 }} />
        )}
        {onSave ? (
          <View style={{ position: "absolute", top: space[8], right: space[8] }}>
            <SaveMark saved={saved} onSave={onSave} />
          </View>
        ) : null}
      </View>
      <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} numberOfLines={2} style={[font.h3, { color: color.primaryText }]}>
        {place.title}
      </Text>
      {facts(place) ? (
        <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} numberOfLines={1} style={[font.label, { color: color.secondaryText }]}>
          {facts(place)}
        </Text>
      ) : null}
      {place.meta ? (
        <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} numberOfLines={2} style={[font.bodySmall, { color: color.mutedText }]}>
          {place.meta}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function CompactPlaceCard({
  place,
  onPress,
  saved = false,
  onSave,
}: {
  place: PlaceCardModel;
  onPress?: () => void;
  saved?: boolean;
  onSave?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={place.title}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        gap: space[12],
        padding: space[12],
        backgroundColor: color.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: color.border,
        alignItems: "flex-start",
        transform: [{ scale: pressed && onPress ? motion.pressScale : 1 }],
      })}
    >
      <View style={{ width: 84, height: 84, borderRadius: radius.medium, overflow: "hidden", backgroundColor: color.accentSoft }}>
        {place.imageUrl ? (
          <CityImage uri={place.imageUrl} alt={place.imageAlt ?? place.title} style={{ width: 84, height: 84 }} />
        ) : (
          <CategoryCover label={place.category} seed={place.title} style={{ width: 84, height: 84 }} />
        )}
      </View>
      <View style={{ flex: 1, gap: space[4], paddingTop: space[4] }}>
        <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} numberOfLines={2} style={[font.h3, { color: color.primaryText }]}>
          {place.title}
        </Text>
        {facts(place) ? (
          <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} numberOfLines={1} style={[font.label, { color: color.secondaryText }]}>
            {facts(place)}
          </Text>
        ) : null}
        {place.meta ? (
          <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} numberOfLines={2} style={[font.bodySmall, { color: color.mutedText }]}>
            {place.meta}
          </Text>
        ) : null}
      </View>
      {onSave ? <SaveMark saved={saved} onSave={onSave} /> : null}
    </Pressable>
  );
}
