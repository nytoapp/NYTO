export const browseCategories = [
  { id: "restaurants", label: "Restaurants", query: "restaurants" },
  { id: "cafes", label: "Cafes", query: "cafes" },
  { id: "museums", label: "Museums", query: "museums" },
  { id: "nightlife", label: "Nightlife", query: "nightlife" },
  { id: "shopping", label: "Shopping", query: "shopping" },
  { id: "things", label: "Things to do", query: "things to do" },
] as const;

export const popularSearches = ["Italian restaurants", "Coffee", "Museums", "Nightlife", "Shopping", "Things to do"] as const;

export function isCatalogId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
