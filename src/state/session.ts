import { create } from "zustand";

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

export const useSession = create<SessionState>((set) => ({
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
}));
