import { create } from "zustand";
import type { Place } from "./catalog";

/** Legacy local library for unused mock cards. Live saves and plans use the API. Safe to remove with catalog.ts. */

export type PlanItem = {
  time: string;
  placeId: string;
};

export type CityPlan = {
  id: string;
  title: string;
  when: string;
  items: PlanItem[];
  past: boolean;
};

export type BookingRequest = {
  id: string;
  placeId: string;
  date: string;
  time: string;
  guests: number;
};

export type EveningDraft = {
  mood: string;
  when: string;
  with: string;
  items: PlanItem[];
};

type LibraryState = {
  savedIds: string[];
  plans: CityPlan[];
  bookings: BookingRequest[];
  draft: EveningDraft | null;
  editingId: string | null;
  journeySeen: boolean;
  toggleSaved: (id: string) => void;
  isSaved: (id: string) => boolean;
  setDraft: (draft: EveningDraft) => void;
  saveDraftAsPlan: () => string | null;
  updatePlan: (id: string, items: PlanItem[]) => void;
  addBooking: (booking: Omit<BookingRequest, "id">) => void;
  dismissJourney: () => void;
};

const saturday: CityPlan = {
  id: "saturday",
  title: "Your evening",
  when: "This Saturday",
  past: false,
  items: [
    { time: "16:00", placeId: "olive-oak" },
    { time: "17:30", placeId: "ngma" },
    { time: "19:00", placeId: "tutto-bello" },
    { time: "21:30", placeId: "indie-nights" },
  ],
};

export const useLibrary = create<LibraryState>((set, get) => ({
  savedIds: ["tutto-bello", "ngma"],
  plans: [saturday],
  bookings: [],
  draft: null,
  editingId: null,
  journeySeen: false,
  toggleSaved: (id) =>
    set((state) => ({
      savedIds: state.savedIds.includes(id) ? state.savedIds.filter((item) => item !== id) : [id, ...state.savedIds],
    })),
  isSaved: (id) => get().savedIds.includes(id),
  setDraft: (draft) => set({ draft }),
  saveDraftAsPlan: () => {
    const draft = get().draft;
    if (!draft) return null;
    const id = `plan-${Date.now()}`;
    const plan: CityPlan = {
      id,
      title: draft.mood === "Surprise me" ? "A CITYDAY evening" : `${draft.mood} evening`,
      when: draft.when,
      past: false,
      items: draft.items,
    };
    set((state) => ({ plans: [plan, ...state.plans], editingId: id }));
    return id;
  },
  updatePlan: (id, items) =>
    set((state) => ({
      plans: state.plans.map((plan) => (plan.id === id ? { ...plan, items } : plan)),
    })),
  addBooking: (booking) =>
    set((state) => ({
      bookings: [{ ...booking, id: `booking-${Date.now()}` }, ...state.bookings],
    })),
  dismissJourney: () => set({ journeySeen: true }),
}));

export function planPlaces(items: PlanItem[], lookup: (id: string) => Place | undefined): { time: string; place: Place }[] {
  return items.flatMap((item) => {
    const place = lookup(item.placeId);
    return place ? [{ time: item.time, place }] : [];
  });
}
