import type { SearchResult } from "@atlas/contracts";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { CityText, Photo } from "./chrome";
import { isCatalogId, kindLabel, subjectMeta } from "./format";
import { city, cityRadius } from "./theme";

function openSubject(router: ReturnType<typeof useRouter>, item: SearchResult) {
  if (isCatalogId(item.id)) {
    router.push(`/subject/${item.id}`);
  }
}

export function SubjectRailCard({ item }: { item: SearchResult }) {
  const router = useRouter();
  const image = item.images[0]?.url ?? "";
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={() => openSubject(router, item)} style={({ pressed }) => [styles.rail, pressed && styles.pressed]}>
      <Photo uri={image} style={styles.railImage} />
      <CityText size="caption" tone="quiet">
        {kindLabel(item.kind).toUpperCase()}
      </CityText>
      <CityText size="section" numberOfLines={2}>
        {item.title}
      </CityText>
      <CityText size="meta" tone="muted" numberOfLines={2}>
        {subjectMeta(item) || item.summary || "From the CITYDAY catalog"}
      </CityText>
    </Pressable>
  );
}

export function SubjectResultCard({ item }: { item: SearchResult }) {
  const router = useRouter();
  const image = item.images[0]?.url ?? "";
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={() => openSubject(router, item)} style={({ pressed }) => [styles.result, pressed && styles.pressed]}>
      <Photo uri={image} style={styles.resultImage} />
      <View style={styles.copy}>
        <CityText size="caption" tone="quiet">
          {kindLabel(item.kind).toUpperCase()}
        </CityText>
        <CityText size="section" numberOfLines={2}>
          {item.title}
        </CityText>
        <CityText size="meta" tone="muted" numberOfLines={2}>
          {subjectMeta(item)}
        </CityText>
        {item.attribution[0]?.text ? (
          <CityText size="caption" tone="quiet" numberOfLines={1}>
            {item.attribution[0].text}
          </CityText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rail: { width: 220, gap: 6 },
  railImage: { width: 220, height: 150, borderRadius: cityRadius.image },
  result: { flexDirection: "row", gap: 12, padding: 10, backgroundColor: city.paper, borderRadius: cityRadius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: city.line },
  resultImage: { width: 92, height: 92, borderRadius: 12 },
  copy: { flex: 1, gap: 3, justifyContent: "center" },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
});
