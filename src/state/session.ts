import { create } from "zustand";

export type SessionState = {
  workoutId: number | null;
  exerciseIds: number[];
  setActive(workoutId: number, exerciseIds: number[]): void;
  clear(): void;
};

export const useSession = create<SessionState>((set) => ({
  workoutId: null,
  exerciseIds: [],
  setActive: (workoutId, exerciseIds) => set({ workoutId, exerciseIds }),
  clear: () => set({ workoutId: null, exerciseIds: [] })
}));
