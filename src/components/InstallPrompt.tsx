import { useEffect, useState, useSyncExternalStore } from "react";

// Chrome-only event; not in lib.dom.d.ts.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// The beforeinstallprompt event often fires before React mounts, so capture
// it at module load rather than inside an effect.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function setDeferred(e: BeforeInstallPromptEvent | null) {
  deferredPrompt = e;
  for (const fn of listeners) fn();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    setDeferred(e as BeforeInstallPromptEvent);
  });
  window.addEventListener("appinstalled", () => setDeferred(null));
}

function useDeferredPrompt(): BeforeInstallPromptEvent | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => deferredPrompt,
    () => null
  );
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true // iOS Safari
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallPrompt() {
  const prompt = useDeferredPrompt();
  const [iosHelpOpen, setIosHelpOpen] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem("install-prompt-dismissed") === "1"
  );
  const [standalone, setStandalone] = useState(isStandalone);

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const onChange = () => setStandalone(isStandalone());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (standalone || dismissed) return null;
  if (!prompt && !isIos()) return null;

  function dismiss() {
    localStorage.setItem("install-prompt-dismissed", "1");
    setDismissed(true);
  }

  async function onInstall() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setDeferred(null);
  }

  return (
    <div className="rounded-2xl bg-slate-800 p-4 shadow ring-1 ring-emerald-600/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">Install this app</div>
          <p className="mt-0.5 text-sm text-slate-400">
            Get it on your home screen — works offline.
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="rounded-lg px-2 py-1 text-slate-400"
        >
          ✕
        </button>
      </div>

      {prompt ? (
        <button
          onClick={onInstall}
          className="mt-3 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium"
        >
          Install app
        </button>
      ) : (
        <div className="mt-3">
          <button
            onClick={() => setIosHelpOpen((o) => !o)}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium"
          >
            {iosHelpOpen ? "Hide instructions" : "Show me how"}
          </button>
          {iosHelpOpen && (
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-300">
              <li>
                Open this page in <span className="font-medium">Safari</span> (installation
                doesn't work from in-app browsers).
              </li>
              <li>
                Tap the <span className="font-medium">Share</span> button{" "}
                <span aria-hidden>⎙</span> in the toolbar.
              </li>
              <li>
                Scroll down and tap{" "}
                <span className="font-medium">Add to Home Screen</span>.
              </li>
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
