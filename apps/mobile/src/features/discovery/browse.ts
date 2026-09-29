import type { SelectedLocation } from "../location/location-store";

export const destinations: { label: string; location: SelectedLocation | null }[] = [
  { label: "Nearby", location: null },
  {
    label: "Paris",
    location: { id: "018f5c3a-7c3a-7000-8000-0000000000a1", label: "Paris", countryCode: "FR", timezone: "Europe/Paris" },
  },
  {
    label: "Bengaluru",
    location: { id: "018f5c3a-7c3a-7000-8000-0000000000a3", label: "Bengaluru", countryCode: "IN", timezone: "Asia/Kolkata" },
  },
];

export const browseCategories = [
  { id: "restaurants", label: "Restaurants", query: "restaurants" },
  { id: "cafes", label: "Cafes", query: "cafes" },
  { id: "hotels", label: "Hotels", query: "hotels" },
  { id: "events", label: "Events", query: "events" },
  { id: "things", label: "Things to do", query: "things to do" },
  { id: "nightlife", label: "Nightlife", query: "nightlife" },
  { id: "shopping", label: "Shopping", query: "shopping" },
  { id: "experiences", label: "Experiences", query: "experiences" },
] as const;

export const popularSearches = ["Italian restaurant", "Late-night drinks", "Live music", "Coffee", "Things to do tonight", "Weekend plans"] as const;

export function isCatalogId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
