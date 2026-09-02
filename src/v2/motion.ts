import { flushSync } from "react-dom";

type ViewTransitionHandle = {
  ready?: Promise<void>;
  finished?: Promise<void>;
  updateCallbackDone?: Promise<void>;
  skipTransition?: () => void;
};
type StartViewTransition = (cb: () => void) => ViewTransitionHandle | undefined;

// Skipping a transition (our 500ms watchdog, or rapid successive updates)
// rejects internal promises we can't always reach — keep that expected noise
// out of the console without touching any other rejection.
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason as { name?: string; message?: string } | undefined;
    if (r?.name === "AbortError" && /transition was skipped/i.test(r?.message ?? "")) {
      e.preventDefault();
    }
  });
}

/**
 * Wrap a state change that swaps screens (route or session phase) in a View
 * Transition, giving a quick cross-fade between the old and new DOM. Falls
 * back to an instant switch where unsupported, hidden, or when the user
 * prefers reduced motion.
 *
 * Hardened for hostile hosts (embedded webviews / background documents) where
 * startViewTransition exists but stalls: the update itself runs via a 100ms
 * watchdog if the callback never fires, and the transition is force-skipped
 * after 500ms so its click-eating snapshot overlay can't linger. On healthy
 * browsers the ~220ms cross-fade finishes well before either deadline.
 * flushSync makes React commit inside the transition callback (React 18
 * would otherwise batch past it).
 */
export function viewTransition(update: () => void): void {
  const reduced =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = (document as Document & { startViewTransition?: StartViewTransition })
    .startViewTransition;
  if (reduced || typeof start !== "function" || document.visibilityState !== "visible") {
    update();
    return;
  }

  let ran = false;
  const runPlain = () => {
    if (ran) return;
    ran = true;
    update();
  };

  let t: ViewTransitionHandle | undefined;
  try {
    t = start.call(document, () => {
      if (ran) return;
      ran = true;
      flushSync(update);
    });
  } catch {
    runPlain();
    return;
  }

  let settled = false;
  const onSettle = () => {
    settled = true;
  };
  t?.ready?.catch(() => {});
  t?.updateCallbackDone?.catch(() => {});
  t?.finished?.then(onSettle, onSettle);

  // Watchdog 1: the state change must never be hostage to the animation.
  setTimeout(runPlain, 100);
  // Watchdog 2: never leave the snapshot overlay up (it swallows taps).
  setTimeout(() => {
    if (!settled) {
      try {
        t?.skipTransition?.();
      } catch {
        // nothing more we can do
      }
    }
  }, 500);
}
