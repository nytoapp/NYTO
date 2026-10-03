import type { SearchResult } from "@atlas/contracts";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { formatPrice, kindLabel } from "./format";
import { CityImage } from "./image";
import { color, font, fontScaleCap, motion, radius, space } from "./theme";

export type PlaceCardModel = {
  id: string;
  title: string;
  category: string | null;
  locality: string | null;
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
    priceLabel: formatPrice(item.price),
    imageUrl: item.images[0]?.url ?? null,
    imageAlt: item.images[0]?.alt ?? item.title,
    meta: item.summary,
  };
}

function SaveMark({ saved, onSave }: { saved: boolean; onSave: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? "Remove from saved" : "Save"}
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

function MetaLine({ place }: { place: PlaceCardModel }) {
  const line = [place.category, place.locality, place.priceLabel].filter(Boolean).join(" · ");
  if (!line && !place.meta) return null;
  return (
    <View style={{ gap: space[4] }}>
      {line ? (
        <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} numberOfLines={1} style={[font.label, { color: color.secondaryText }]}>
          {line}
        </Text>
      ) : null}
      {place.meta ? (
        <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} numberOfLines={2} style={[font.bodySmall, { color: color.mutedText }]}>
          {place.meta}
        </Text>
      ) : null}
    </View>
  );
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
      <View>
        <CityImage uri={place.imageUrl} alt={place.imageAlt ?? place.title} radius={radius.image} style={{ width: "100%", aspectRatio: 4 / 5 }} />
        {onSave ? (
          <View style={{ position: "absolute", top: space[12], right: space[12] }}>
            <SaveMark saved={saved} onSave={onSave} />
          </View>
        ) : null}
      </View>
      <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} numberOfLines={2} style={[font.h3, { color: color.primaryText }]}>
        {place.title}
      </Text>
      <MetaLine place={place} />
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
        alignItems: "center",
        transform: [{ scale: pressed && onPress ? motion.pressScale : 1 }],
      })}
    >
      <CityImage uri={place.imageUrl} alt={place.imageAlt ?? place.title} radius={radius.medium} style={{ width: 88, height: 88 }} />
      <View style={{ flex: 1, gap: space[4] }}>
        <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} numberOfLines={2} style={[font.h3, { color: color.primaryText }]}>
          {place.title}
        </Text>
        <MetaLine place={place} />
      </View>
      {onSave ? <SaveMark saved={saved} onSave={onSave} /> : null}
    </Pressable>
  );
}
