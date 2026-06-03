import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { allCurrentBests, snapshotsForMuscle } from "../db/queries";
import { useDbVersion } from "../db/client";

export function Progress() {
  useDbVersion();
  const bests = allCurrentBests();
  const [selected, setSelected] = useState<string | null>(bests[0]?.muscle ?? null);

  if (bests.length === 0) {
    return (
      <div className="text-slate-400">
        No strength data yet. Log a few sets to see progress.
      </div>
    );
  }

  const active = selected ?? bests[0].muscle;
  const series = snapshotsForMuscle(active).map((s) => ({
    t: new Date(s.recorded_at).getTime(),
    label: new Date(s.recorded_at).toLocaleDateString(),
    est: s.est_1rm_kg
  }));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Progress</h1>

      <div className="flex flex-wrap gap-2">
        {bests.map((b) => (
          <button
            key={b.muscle}
            onClick={() => setSelected(b.muscle)}
            className={`rounded-full px-3 py-1 text-sm ${
              b.muscle === active ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"
            }`}
          >
            {b.muscle.replace("_", " ")} · {b.est_1rm_kg}kg
          </button>
        ))}
      </div>

      <div className="h-64 rounded-2xl bg-slate-800 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} />
            <Tooltip
              contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8 }}
              labelStyle={{ color: "#cbd5e1" }}
            />
            <Line type="monotone" dataKey="est" stroke="#3b82f6" strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-slate-500">
        Estimated 1RM uses the Epley formula: weight × (1 + reps/30). New points are recorded when a
        set produces a new personal best for that muscle.
      </p>
    </div>
  );
}
