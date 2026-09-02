import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { dbIsPersistent, useDbReady, useDbVersion } from "../db/client";
import { getPref } from "./queries";
import { OnboardV2 } from "./screens/Onboard";

/**
 * v2 shell: DB gate, onboarding gate, and the phone-shaped column. Screens own
 * their own nav (the prototype's home nav is on-color; workout has none).
 */
export function ShellV2() {
  const dbReady = useDbReady();
  useDbVersion();
  const navigate = useNavigate();
  const location = useLocation();

  if (!dbReady) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-grey-600)" }}>
        Loading…
      </div>
    );
  }

  const onboarded = getPref("onboarded") === "1";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", background: "var(--color-grey-100)" }}>
      {!dbIsPersistent() && (
        <div style={{ width: "100%", background: "var(--color-yellow-50)", color: "var(--color-yellow-900)", padding: "8px 16px", textAlign: "center", fontSize: 12, flexShrink: 0 }}>
          Storage unavailable in this browser — data will be lost when you close or reload this page.
        </div>
      )}
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          fontFamily: "var(--font-body)",
          color: "var(--color-grey-900)"
        }}
      >
        {!onboarded && location.pathname === "/" ? <OnboardV2 onDone={() => navigate("/")} /> : <Outlet />}
      </div>
    </div>
  );
}
