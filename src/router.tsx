import { createHashRouter } from "react-router-dom";
import { ShellV2 } from "./v2/Shell";
import { HomeV2 } from "./v2/screens/Home";
import { SessionV2 } from "./v2/screens/Session";
import { HistoryV2 } from "./v2/screens/History";
import { ProgressV2 } from "./v2/screens/Progress";
import { SettingsV2 } from "./v2/screens/Settings";

// HashRouter is robust for GitHub Pages — no 404 fallback needed.
// v1 screens still exist under src/screens/ (unrouted) until the history
// importer ships; see OVERHAUL_PLAN.md Phase 4.
export const router = createHashRouter([
  {
    element: <ShellV2 />,
    children: [
      { path: "/", element: <HomeV2 /> },
      { path: "/session", element: <SessionV2 /> },
      { path: "/history", element: <HistoryV2 /> },
      { path: "/progress", element: <ProgressV2 /> },
      { path: "/settings", element: <SettingsV2 /> },
      // Legacy v1 paths (old bookmarks / restored sessions) land on Home.
      { path: "*", element: <HomeV2 /> }
    ]
  }
]);
