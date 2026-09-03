import { flushDb } from "../db/client";

/**
 * Manual "get the latest version" for the installed PWA. The service worker
 * (vite-plugin-pwa autoUpdate) checks for updates on its own schedule; this
 * forces a check right now and reloads into the new version when one lands,
 * so the user never has to do the close-and-reopen-twice dance.
 */
export type UpdateResult = "reloading" | "up-to-date" | "unavailable" | "failed";

let reloadArmed = false;
function reloadOnControllerChange(): void {
  if (reloadArmed) return;
  reloadArmed = true;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    void flushDb().finally(() => window.location.reload());
  });
}

export async function checkForUpdates(): Promise<UpdateResult> {
  if (!("serviceWorker" in navigator)) return "unavailable";
  let reg: ServiceWorkerRegistration | undefined;
  try {
    reg = await navigator.serviceWorker.getRegistration();
  } catch {
    return "unavailable";
  }
  if (!reg) return "unavailable"; // dev server / SW not registered yet

  try {
    await reg.update();
  } catch {
    return "failed"; // usually offline
  }

  const fresh = reg.installing ?? reg.waiting;
  if (!fresh) return "up-to-date";

  // The autoUpdate SW skips waiting on its own; when it takes control the
  // page reloads into the new assets. Nudge a waiting worker just in case.
  reloadOnControllerChange();
  reg.waiting?.postMessage({ type: "SKIP_WAITING" });
  return "reloading";
}
