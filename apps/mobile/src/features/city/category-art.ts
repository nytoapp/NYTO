import type { ImageSourcePropType } from "react-native";
import { interests } from "../onboarding/interests";

const interestIdByWord: Record<string, string> = {
  food: "food",
  restaurant: "food",
  restaurants: "food",
  italian: "food",
  cafe: "food",
  cafes: "food",
  coffee: "food",
  culture: "culture",
  cultural: "culture",
  museum: "culture",
  museums: "culture",
  gallery: "culture",
  movie: "culture",
  movies: "culture",
  music: "music",
  concert: "music",
  concerts: "music",
  shopping: "shopping",
  shop: "shopping",
  nightlife: "nightlife",
  drinks: "nightlife",
  bar: "nightlife",
  bars: "nightlife",
  outdoors: "outdoors",
  park: "outdoors",
  parks: "outdoors",
  wellness: "wellness",
  spa: "wellness",
  hotel: "activities",
  hotels: "activities",
  attraction: "activities",
  attractions: "activities",
  activity: "activities",
  activities: "activities",
  experience: "activities",
  experiences: "activities",
  social: "nightlife",
  surprise: "surprise",
};

export function categoryArt(label: string | null | undefined): ImageSourcePropType {
  const words = (label ?? "").toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const interestId = words.map((word) => interestIdByWord[word]).find(Boolean) ?? "surprise";
  return interests.find((item) => item.id === interestId)?.image ?? interests[0].image;
}
