import { useEffect, useState } from "react";
import { Image, StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";
import { color } from "./theme";

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

const styles = StyleSheet.create({
  frame: {
    backgroundColor: color.imagePlaceholder,
    overflow: "hidden",
  },
});
