/**
 * Shared v2 UI primitives, translated 1:1 from the Claude Design prototype
 * (Simple Workout v2 prototype.dc.html). Styling is inline + Google DS tokens,
 * matching the prototype's idiom rather than Tailwind.
 */
import { useNavigate } from "react-router-dom";
import type { CSSProperties, ReactNode } from "react";
import { viewTransition } from "./motion";

/** Keeps the bottom bar visually pinned while screens cross-fade under it. */
const NAV_TRANSITION_NAME = { viewTransitionName: "bottom-nav" } as CSSProperties;

export function Icon({ name, size = 24, fill = false, color, style }: {
  name: string;
  size?: number;
  fill?: boolean;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={fill ? "material-symbols-rounded fill" : "material-symbols-rounded"}
      style={{ fontSize: size, color, ...style }}
      aria-hidden
    >
      {name}
    </span>
  );
}

export function Pill({ children, onClick, background, color, height = 56, flex, border, gap = 10, fontSize = 16, style }: {
  children: ReactNode;
  onClick?: () => void;
  background: string;
  color: string;
  height?: number;
  flex?: number;
  border?: string;
  gap?: number;
  fontSize?: number;
  style?: CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      className="tap"
      style={{
        height,
        flex,
        border: border ?? "none",
        borderRadius: 999,
        background,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap,
        fontSize,
        fontWeight: 500,
        fontFamily: "var(--font-body)",
        padding: "0 24px",
        width: flex ? undefined : "100%",
        cursor: "pointer",
        ...style
      }}
    >
      {children}
    </button>
  );
}

export function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="tap"
      style={{
        width: 52,
        height: 32,
        borderRadius: 999,
        border: checked ? "none" : "2px solid var(--color-grey-500)",
        background: checked ? "var(--color-blue-600)" : "var(--color-grey-100)",
        position: "relative",
        cursor: "pointer",
        padding: 0,
        flexShrink: 0
      }}
    >
      <span
        style={{
          position: "absolute",
          top: checked ? 4 : 6,
          left: checked ? 24 : 6,
          width: checked ? 24 : 16,
          height: checked ? 24 : 16,
          borderRadius: "50%",
          background: checked ? "#fff" : "var(--color-grey-500)",
          transition: "all .15s"
        }}
      />
    </button>
  );
}

export function FilterChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="tap"
      style={{
        height: 32,
        padding: "0 12px",
        borderRadius: 8,
        border: selected ? "1px solid transparent" : "1px solid var(--color-grey-400)",
        background: selected ? "var(--color-blue-100)" : "#fff",
        color: selected ? "var(--color-blue-900)" : "var(--color-grey-800)",
        fontSize: 14,
        fontWeight: 500,
        fontFamily: "var(--font-body)",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        cursor: "pointer"
      }}
    >
      {selected && <Icon name="check" size={16} />}
      {label}
    </button>
  );
}

export const NAV_ITEMS = [
  { path: "/", label: "Today", icon: "today" },
  { path: "/history", label: "History", icon: "history" },
  { path: "/progress", label: "Progress", icon: "trending_up" },
  { path: "/settings", label: "Settings", icon: "settings" }
] as const;

/** Bottom nav — light variant (History / Progress / Settings). */
export function LightNav({ active }: { active: string }) {
  const navigate = useNavigate();
  return (
    <nav
      style={{
        height: 80,
        display: "flex",
        alignItems: "flex-start",
        paddingTop: 12,
        background: "var(--color-grey-50)",
        borderTop: "1px solid var(--color-grey-200)",
        flexShrink: 0,
        ...NAV_TRANSITION_NAME
      }}
    >
      {NAV_ITEMS.map((n) => {
        const on = n.path === active;
        return (
          <div
            key={n.path}
            className="tap"
            onClick={() => viewTransition(() => navigate(n.path))}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}
          >
            <span
              style={{
                width: 64,
                height: 32,
                borderRadius: 16,
                background: on ? "var(--color-blue-100)" : "transparent",
                transition: "background .25s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Icon
                name={n.icon}
                size={24}
                fill={on}
                color={on ? "var(--color-blue-800)" : "var(--color-grey-700)"}
                style={{ transition: "color .25s" }}
              />
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: on ? "var(--color-grey-900)" : "var(--color-grey-700)",
                transition: "color .25s"
              }}
            >
              {n.label}
            </span>
          </div>
        );
      })}
    </nav>
  );
}

/** Bottom nav — on-color variant used on the blue Home screen. */
export function HomeNav() {
  const navigate = useNavigate();
  return (
    <nav
      style={{
        position: "relative",
        height: 80,
        display: "flex",
        alignItems: "flex-start",
        paddingTop: 12,
        background: "rgba(0,0,0,.18)",
        ...NAV_TRANSITION_NAME
      }}
    >
      {NAV_ITEMS.map((n) => {
        const on = n.path === "/";
        return (
          <div
            key={n.path}
            className="tap"
            onClick={() => viewTransition(() => navigate(n.path))}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}
          >
            <span
              style={{
                width: 64,
                height: 32,
                borderRadius: 16,
                background: on ? "rgba(255,255,255,.2)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Icon name={n.icon} size={24} fill={on} color={on ? "#fff" : "rgba(255,255,255,.75)"} />
            </span>
            <span style={{ fontSize: 12, fontWeight: 500, color: on ? "#fff" : "rgba(255,255,255,.75)" }}>{n.label}</span>
          </div>
        );
      })}
    </nav>
  );
}

/** Section label — 12px uppercase tracking, used across screens. */
export function SectionLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: 0.5,
        textTransform: "uppercase",
        color: "var(--color-grey-600)",
        ...style
      }}
    >
      {children}
    </div>
  );
}
