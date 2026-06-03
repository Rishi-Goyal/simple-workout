import { useState } from "react";

export function HowTo({ text, defaultOpen = false }: { text: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const steps = text.split("\n").filter(Boolean);

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-blue-400"
        aria-expanded={open}
      >
        <span>{open ? "▾" : "▸"}</span>
        <span>How to do this</span>
      </button>
      {open && (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-300">
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
