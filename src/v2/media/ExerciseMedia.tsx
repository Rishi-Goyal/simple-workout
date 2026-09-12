import { useEffect, useState } from "react";
import type { LadderExercise, PatternId } from "../ladders";
import { Icon } from "../ui";
import { mediaFor } from "./index";

/** Material Symbols shown when an exercise has no verified frames yet. */
const PATTERN_ICON: Record<PatternId, string> = {
  squat: "airline_seat_legroom_extra",
  hinge: "fitness_center",
  h_push: "sports_gymnastics",
  v_push: "sports_gymnastics",
  h_pull: "sports_martial_arts",
  v_pull: "sports_martial_arts",
  core: "self_improvement"
};

const CARD_HEIGHT = 180;

/**
 * The picture at the top of the workout screen: frame 0 (start position),
 * tap to see frame 1 (end position). Renders a quiet icon card when the
 * exercise has no verified media — never a "pending" message.
 */
export function ExerciseMedia({ exercise, pattern, autoplayMs }: { exercise: LadderExercise; pattern: PatternId; autoplayMs?: number }) {
  const media = mediaFor(exercise);
  const [frame, setFrame] = useState(0);
  useEffect(() => setFrame(0), [exercise.id]);

  const canToggle = (media?.frames.length ?? 0) > 1;
  useEffect(() => {
    if (!autoplayMs || !canToggle) return;
    const t = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), autoplayMs);
    return () => clearInterval(t);
  }, [autoplayMs, canToggle, exercise.id]);

  const base = {
    marginTop: 12,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    flexShrink: 0
  } as const;

  if (!media) {
    return (
      <div
        style={{
          ...base,
          background: "var(--color-grey-100)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          color: "var(--color-grey-600)"
        }}
        aria-label={exercise.name}
      >
        <Icon name={PATTERN_ICON[pattern]} size={40} color="var(--color-grey-500)" />
        <span style={{ fontSize: 12, letterSpacing: 0.4 }}>{exercise.name}</span>
      </div>
    );
  }

  const imgs = media.frames.map((src, i) => (
    <img
      key={src}
      src={src}
      alt={media.alt[i]}
      decoding="async"
      draggable={false}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "contain",
        opacity: i === frame ? 1 : 0,
        transition: "opacity .15s"
      }}
    />
  ));

  const shell = {
    ...base,
    width: "100%",
    display: "block",
    padding: 0,
    background: "#fff",
    border: "1px solid var(--color-grey-200)",
    cursor: canToggle ? "pointer" : "default",
    fontFamily: "var(--font-body)"
  } as const;

  if (!canToggle) return <div style={shell}>{imgs}</div>;

  return (
    <button
      type="button"
      className="tap"
      onClick={() => setFrame((f) => (f === 0 ? 1 : 0))}
      aria-label={frame === 0 ? "Show end position" : "Show start position"}
      style={shell}
    >
      {imgs}
      <span
        style={{
          position: "absolute",
          right: 10,
          bottom: 10,
          height: 22,
          padding: "0 8px",
          borderRadius: 11,
          background: "rgba(0,0,0,.55)",
          color: "#fff",
          fontSize: 12,
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          gap: 4
        }}
      >
        {frame + 1}/2
        <Icon name="swap_horiz" size={14} />
      </span>
    </button>
  );
}
