import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type SessionState = {
  workoutId: number | null;
  exerciseIds: number[];
  warmupIds: number[];
  warmupDone: Record<number, boolean>;
  setActive(workoutId: number, exerciseIds: number[]): void;
  setWarmups(ids: number[]): void;
  toggleWarmupDone(id: number): void;
  clear(): void;
};

// Persisted to localStorage so an in-progress session survives the page
// being killed (mobile tab switches, reloads). The workout itself lives in
// SQLite; this is just the pointer to it plus ephemeral warmup state.
export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      workoutId: null,
      exerciseIds: [],
      warmupIds: [],
      warmupDone: {},
      setActive: (workoutId, exerciseIds) => set({ workoutId, exerciseIds }),
      setWarmups: (ids) => set({ warmupIds: ids, warmupDone: {} }),
      toggleWarmupDone: (id) =>
        set((s) => ({ warmupDone: { ...s.warmupDone, [id]: !s.warmupDone[id] } })),
      clear: () =>
        set({ workoutId: null, exerciseIds: [], warmupIds: [], warmupDone: {} })
    }),
    {
      name: "workout-session",
      storage: createJSONStorage(() => localStorage)
    }
  )
);
