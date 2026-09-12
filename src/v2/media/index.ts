/**
 * Bundled exercise frames. Files land here only after the human verification
 * gate (scripts/import-exercise-media.mjs verify); Vite hashes them and the
 * service worker precaches them, so a frame can never be swapped under an
 * installed app without a new build.
 */
import type { LadderExercise } from "../ladders";

const files = import.meta.glob<string>("./*.webp", { eager: true, query: "?url", import: "default" });

export type ExerciseMediaFrames = { frames: string[]; alt: string[] };

export function mediaFor(ex: Pick<LadderExercise, "id" | "name" | "mediaRef">): ExerciseMediaFrames | null {
  if (!ex.mediaRef) return null;
  const frames = [0, 1].map((i) => files[`./${ex.mediaRef}-${i}.webp`]).filter((u): u is string => Boolean(u));
  if (frames.length === 0) {
    if (import.meta.env.DEV) console.warn(`mediaRef set but no bundled frames: ${ex.mediaRef}`);
    return null;
  }
  const alt = frames.length === 1 ? [ex.name] : [`${ex.name} — start position`, `${ex.name} — end position`];
  return { frames, alt };
}
