import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type SessionPhase = "warmup" | "exercise" | "rest" | "finish";

/**
 * Pointer to the in-progress session plus ephemeral stepper state. Persisted
 * to localStorage so a killed tab resumes mid-workout; the sets themselves
 * live in SQLite (v2_sets). restEndsAt is an absolute epoch-ms timestamp so
 * the countdown survives background tabs and reloads.
 */
export type V2SessionState = {
  sessionId: number | null;
  phase: SessionPhase;
  exIdx: number;
  restEndsAt: number | null;
  restTotalSec: number;
  howToOpen: boolean;
  /** "Not today — switch day": overrides the rotation until a session starts. */
  dayOverride: "push" | "pull" | "legs" | null;
  setDayOverride(day: "push" | "pull" | "legs" | null): void;
  begin(sessionId: number, withWarmup: boolean): void;
  setPhase(phase: SessionPhase): void;
  setExIdx(i: number): void;
  startRest(totalSec: number): void;
  addRest(sec: number): void;
  toggleHowTo(): void;
  clear(): void;
};

export const useV2Session = create<V2SessionState>()(
  persist(
    (set) => ({
      sessionId: null,
      phase: "exercise",
      exIdx: 0,
      restEndsAt: null,
      restTotalSec: 90,
      howToOpen: false,
      dayOverride: null,
      setDayOverride: (dayOverride) => set({ dayOverride }),
      begin: (sessionId, withWarmup) =>
        set({ sessionId, phase: withWarmup ? "warmup" : "exercise", exIdx: 0, restEndsAt: null, howToOpen: false, dayOverride: null }),
      setPhase: (phase) => set({ phase, howToOpen: false }),
      setExIdx: (exIdx) => set({ exIdx, howToOpen: false }),
      startRest: (totalSec) =>
        set({ phase: "rest", restEndsAt: Date.now() + totalSec * 1000, restTotalSec: totalSec }),
      addRest: (sec) =>
        set((s) => ({
          restEndsAt: (s.restEndsAt ?? Date.now()) + sec * 1000,
          restTotalSec: s.restTotalSec + sec
        })),
      toggleHowTo: () => set((s) => ({ howToOpen: !s.howToOpen })),
      clear: () => set({ sessionId: null, phase: "exercise", exIdx: 0, restEndsAt: null, howToOpen: false })
    }),
    { name: "v2-session", storage: createJSONStorage(() => localStorage) }
  )
);
