import { create } from "zustand";

type Handoff = {
  pending: string | null;
  recent: string[];
  ask: (query: string) => void;
  take: () => string | null;
  remember: (query: string) => void;
};

export const useSearchHandoff = create<Handoff>((set, get) => ({
  pending: null,
  recent: [],
  ask: (query) => set({ pending: query.trim() }),
  take: () => {
    const pending = get().pending;
    set({ pending: null });
    return pending;
  },
  remember: (query) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    set((state) => ({ recent: [trimmed, ...state.recent.filter((item) => item !== trimmed)].slice(0, 6) }));
  },
}));
