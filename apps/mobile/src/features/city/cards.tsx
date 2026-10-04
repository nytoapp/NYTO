import type { SearchResult } from "@atlas/contracts";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { isCatalogId } from "./format";
import { CompactPlaceCard, LargePlaceCard, placeCardFromResult } from "./place-card";

function openSubject(router: ReturnType<typeof useRouter>, item: SearchResult) {
  if (isCatalogId(item.id)) {
    router.push(`/subject/${item.id}`);
  }
}

export function SubjectRailCard({ item }: { item: SearchResult }) {
  const router = useRouter();
  return (
    <View style={{ width: 220 }}>
      <LargePlaceCard place={placeCardFromResult(item)} onPress={() => openSubject(router, item)} />
    </View>
  );
}

export function SubjectResultCard({ item }: { item: SearchResult }) {
  const router = useRouter();
  return <CompactPlaceCard place={placeCardFromResult(item)} onPress={() => openSubject(router, item)} />;
}
