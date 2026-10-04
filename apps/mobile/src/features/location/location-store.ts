import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const STORAGE_KEY = "cityday.discoveryLocation";

/**
 * The city the person chose to browse.
 * This is not the device's GPS position. A traveler can browse a city from anywhere.
 */
export type SelectedLocation = {
  id: string;
  label: string;
  countryCode: string;
  timezone: string;
};

type LocationState = {
  selected: SelectedLocation | null;
  hydrated: boolean;
  setSelected: (location: SelectedLocation | null) => void;
  hydrate: () => Promise<void>;
};

function isLocation(value: unknown): value is SelectedLocation {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id) &&
    typeof row.label === "string" &&
    row.label.trim().length > 0 &&
    typeof row.countryCode === "string" &&
    row.countryCode.trim().length === 2 &&
    typeof row.timezone === "string" &&
    row.timezone.includes("/")
  );
}

export const useDiscoveryLocation = create<LocationState>((set) => ({
  selected: null,
  hydrated: false,
  setSelected: (selected) => {
    set({ selected });
    const write = selected ? SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(selected)) : SecureStore.deleteItemAsync(STORAGE_KEY);
    void write.catch(() => undefined);
  },
  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      set({ selected: isLocation(parsed) ? parsed : null, hydrated: true });
    } catch {
      set({ selected: null, hydrated: true });
    }
  },
}));
