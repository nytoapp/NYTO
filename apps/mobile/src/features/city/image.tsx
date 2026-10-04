import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";
import { color, font, fontScaleCap, radius, space } from "./theme";

function httpsUri(uri: string | null | undefined): string | null {
  if (!uri) return null;
  try {
    const url = new URL(uri);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function CityImage({
  uri,
  alt,
  style,
  radius,
}: {
  uri: string | null | undefined;
  alt?: string;
  style?: StyleProp<ImageStyle | ViewStyle>;
  radius?: number;
}) {
  const source = httpsUri(uri);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [source]);

  const showImage = Boolean(source) && !failed;

  return (
    <View
      accessibilityLabel={alt}
      style={[styles.frame, style, radius !== undefined ? { borderRadius: radius } : null]}
    >
      {showImage ? (
        <Image
          accessibilityIgnoresInvertColors
          source={{ uri: source ?? undefined }}
          resizeMode="cover"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          style={[StyleSheet.absoluteFill, { opacity: loaded ? 1 : 0 }]}
        />
      ) : null}
    </View>
  );
}

/** Compact stand-in when a place has no photo. Not a stand-in image. */
export function MissingMedia({ label, style }: { label: string; style?: StyleProp<ViewStyle> }) {
  const word = label.trim() || "Place";
  return (
    <View accessibilityLabel={`${word}. No photo`} style={[styles.missing, style]}>
      <Text allowFontScaling maxFontSizeMultiplier={fontScaleCap} numberOfLines={3} style={styles.missingLabel}>
        {word}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: color.imagePlaceholder,
    overflow: "hidden",
  },
  missing: {
    backgroundColor: color.accentSoft,
    borderRadius: radius.medium,
    paddingHorizontal: space[12],
    paddingVertical: space[12],
    justifyContent: "flex-end",
    minHeight: 72,
  },
  missingLabel: {
    ...font.caption,
    color: color.secondaryText,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
});
