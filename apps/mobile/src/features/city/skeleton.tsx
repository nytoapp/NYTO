import { View } from "react-native";
import { color, radius, space } from "./theme";

export function Skeleton({
  width = "100%",
  height = 16,
  round = radius.small,
}: {
  width?: number | `${number}%`;
  height?: number;
  round?: number;
}) {
  return <View accessibilityLabel="Loading" style={{ width, height, borderRadius: round, backgroundColor: color.imagePlaceholder }} />;
}

export function TextSkeleton({ width = "60%" }: { width?: number | `${number}%` }) {
  return <Skeleton width={width} height={14} round={radius.small} />;
}

export function CardSkeleton() {
  return (
    <View style={{ gap: space[8] }}>
      <Skeleton height={180} round={radius.image} />
      <TextSkeleton width="72%" />
      <TextSkeleton width="40%" />
    </View>
  );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View style={{ gap: space[12] }}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={{ flexDirection: "row", gap: space[12], alignItems: "center" }}>
          <Skeleton width={88} height={88} round={radius.medium} />
          <View style={{ flex: 1, gap: space[8] }}>
            <TextSkeleton width="80%" />
            <TextSkeleton width="48%" />
          </View>
        </View>
      ))}
    </View>
  );
}
