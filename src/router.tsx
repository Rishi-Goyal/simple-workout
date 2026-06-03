import { createHashRouter } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { Home } from "./screens/Home";
import { ActiveWorkout } from "./screens/ActiveWorkout";
import { History } from "./screens/History";
import { Progress } from "./screens/Progress";
import { Exercises } from "./screens/Exercises";

// HashRouter is robust for GitHub Pages — no 404 fallback needed.
export const router = createHashRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/workout/active", element: <ActiveWorkout /> },
      { path: "/history", element: <History /> },
      { path: "/progress", element: <Progress /> },
      { path: "/exercises", element: <Exercises /> }
    ]
  }
]);
