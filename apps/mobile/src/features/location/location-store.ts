import { create } from "zustand";

export type SelectedLocation = {
  id: string;
  label: string;
  countryCode: string;
  timezone: string;
};

type LocationState = {
  selected: SelectedLocation | null;
  setSelected: (location: SelectedLocation | null) => void;
};

export const useDiscoveryLocation = create<LocationState>((set) => ({
  selected: null,
  setSelected: (selected) => set({ selected }),
}));
