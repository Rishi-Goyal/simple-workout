import { useState } from "react";
import { addCustomExercise, archiveExercise, listExercises, type DayType } from "../db/queries";
import { useDbVersion } from "../db/client";
import { HowTo } from "../components/HowTo";

const MUSCLES = [
  "chest", "front_delts", "side_delts", "rear_delts", "triceps", "biceps",
  "upper_back", "lats", "forearms", "quads", "hamstrings", "glutes", "calves", "core"
];

export function Exercises() {
  useDbVersion();
  const all = listExercises();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "push" as DayType,
    primary_muscle: "chest",
    secondary: "",
    equipment: "barbell",
    rep_scheme: "compound" as "compound" | "isolation",
    upper_body: true
  });

  function submit() {
    if (!form.name.trim()) return;
    addCustomExercise({
      name: form.name.trim(),
      category: form.category,
      primary_muscle: form.primary_muscle,
      secondary_muscles: form.secondary
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      equipment: form.equipment,
      rep_scheme: form.rep_scheme,
      upper_body: form.upper_body
    });
    setOpen(false);
    setForm({ ...form, name: "", secondary: "" });
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exercises</h1>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm"
        >
          {open ? "Cancel" : "Add"}
        </button>
      </header>

      {open && (
        <section className="rounded-2xl bg-slate-800 p-4 space-y-3">
          <Field label="Name">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded bg-slate-900 px-2 py-2"
            />
          </Field>
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as DayType })}
              className="w-full rounded bg-slate-900 px-2 py-2"
            >
              <option value="push">Push</option>
              <option value="pull">Pull</option>
              <option value="legs">Legs</option>
            </select>
          </Field>
          <Field label="Primary muscle">
            <select
              value={form.primary_muscle}
              onChange={(e) => setForm({ ...form, primary_muscle: e.target.value })}
              className="w-full rounded bg-slate-900 px-2 py-2"
            >
              {MUSCLES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Secondary muscles (comma-separated)">
            <input
              value={form.secondary}
              onChange={(e) => setForm({ ...form, secondary: e.target.value })}
              placeholder="e.g. triceps, front_delts"
              className="w-full rounded bg-slate-900 px-2 py-2"
            />
          </Field>
          <Field label="Equipment">
            <select
              value={form.equipment}
              onChange={(e) => setForm({ ...form, equipment: e.target.value })}
              className="w-full rounded bg-slate-900 px-2 py-2"
            >
              <option value="barbell">Barbell</option>
              <option value="dumbbell">Dumbbell</option>
              <option value="machine">Machine</option>
              <option value="cable">Cable</option>
              <option value="bodyweight">Bodyweight</option>
            </select>
          </Field>
          <Field label="Type">
            <select
              value={form.rep_scheme}
              onChange={(e) => setForm({ ...form, rep_scheme: e.target.value as any })}
              className="w-full rounded bg-slate-900 px-2 py-2"
            >
              <option value="compound">Compound (3×8)</option>
              <option value="isolation">Isolation (3×12)</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.upper_body}
              onChange={(e) => setForm({ ...form, upper_body: e.target.checked })}
            />
            Upper body (smaller weight increments)
          </label>
          <button onClick={submit} className="w-full rounded-lg bg-green-600 py-2 font-medium">
            Save
          </button>
        </section>
      )}

      <ul className="space-y-2">
        {all.map((ex) => (
          <li key={ex.id} className="rounded-xl bg-slate-800 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium">{ex.name}</div>
                <div className="text-xs text-slate-400 capitalize">
                  {ex.category} · {ex.primary_muscle.replace("_", " ")} ·{" "}
                  {ex.is_compound ? "compound" : "isolation"}
                  {ex.is_custom ? " · custom" : ""}
                </div>
                {ex.description && (
                  <p className="mt-1 text-sm text-slate-300">{ex.description}</p>
                )}
              </div>
              <button
                onClick={() => archiveExercise(ex.id)}
                className="text-xs text-slate-400 hover:text-red-400"
              >
                archive
              </button>
            </div>
            {ex.how_to && <HowTo text={ex.how_to} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-slate-400">{label}</div>
      {children}
    </label>
  );
}
