import type { Ionicons } from "@expo/vector-icons";

type IconName = keyof typeof Ionicons.glyphMap;

export type Interest = {
  id: string;
  label: string;
  query: string;
  icon: IconName;
};

export const interests: Interest[] = [
  { id: "food", label: "Food", query: "restaurants", icon: "restaurant-outline" },
  { id: "drinks", label: "Drinks", query: "bars", icon: "wine-outline" },
  { id: "music", label: "Music", query: "live music", icon: "musical-notes-outline" },
  { id: "culture", label: "Art & Culture", query: "museums", icon: "color-palette-outline" },
  { id: "sports", label: "Sports", query: "sports", icon: "bicycle-outline" },
  { id: "wellness", label: "Wellness", query: "wellness", icon: "leaf-outline" },
  { id: "nature", label: "Nature", query: "parks", icon: "trail-sign-outline" },
  { id: "business", label: "Tech & Business", query: "coworking", icon: "briefcase-outline" },
  { id: "fashion", label: "Fashion", query: "shopping", icon: "shirt-outline" },
];

export function interestsById(ids: string[]): Interest[] {
  return interests.filter((item) => ids.includes(item.id));
}
