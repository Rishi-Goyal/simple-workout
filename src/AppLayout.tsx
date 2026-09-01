import { NavLink, Outlet, useNavigation } from "react-router-dom";
import { dbIsPersistent, useDbReady } from "./db/client";

const tabs = [
  { to: "/", label: "Today" },
  { to: "/history", label: "History" },
  { to: "/progress", label: "Progress" },
  { to: "/exercises", label: "Exercises" },
  { to: "/settings", label: "Settings" }
];

export function AppLayout() {
  const dbReady = useDbReady();
  const nav = useNavigation();

  if (!dbReady) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {!dbIsPersistent() && (
        <div className="bg-amber-900/80 px-4 py-2 text-center text-xs text-amber-200">
          Storage unavailable in this browser — data will be lost when you
          close or reload this page.
        </div>
      )}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="mx-auto max-w-md px-4 py-4">
          <Outlet />
        </div>
        {nav.state === "loading" && (
          <div className="fixed top-0 left-0 right-0 h-0.5 bg-blue-500 animate-pulse" />
        )}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-700 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-md">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === "/"}
              className={({ isActive }) =>
                `flex-1 py-3 text-center text-sm ${
                  isActive ? "text-white font-semibold" : "text-slate-400"
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
