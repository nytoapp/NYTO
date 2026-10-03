import type { Ionicons } from "@expo/vector-icons";
import type { ImageSourcePropType } from "react-native";

type IconName = keyof typeof Ionicons.glyphMap;

export type Interest = {
  id: string;
  label: string;
  query: string;
  icon: IconName;
  image: ImageSourcePropType;
};

export const interests: Interest[] = [
  { id: "food", label: "Food", query: "restaurants", icon: "restaurant-outline", image: require("../../../assets/interests/food.jpg") },
  { id: "music", label: "Music", query: "live music", icon: "musical-notes-outline", image: require("../../../assets/interests/music.jpg") },
  { id: "culture", label: "Culture", query: "museums", icon: "color-palette-outline", image: require("../../../assets/interests/culture.jpg") },
  { id: "outdoors", label: "Outdoors", query: "parks", icon: "leaf-outline", image: require("../../../assets/interests/outdoors.jpg") },
  { id: "shopping", label: "Shopping", query: "shopping", icon: "bag-outline", image: require("../../../assets/interests/shopping.jpg") },
  { id: "nightlife", label: "Nightlife", query: "nightlife", icon: "moon-outline", image: require("../../../assets/interests/nightlife.jpg") },
  { id: "activities", label: "Activities", query: "things to do", icon: "walk-outline", image: require("../../../assets/interests/activities.jpg") },
  { id: "wellness", label: "Wellness", query: "wellness", icon: "flower-outline", image: require("../../../assets/interests/wellness.jpg") },
  { id: "surprise", label: "Surprise me", query: "things to do", icon: "sparkles-outline", image: require("../../../assets/interests/surprise.jpg") },
];

export function interestsById(ids: string[]): Interest[] {
  return interests.filter((item) => ids.includes(item.id));
}
