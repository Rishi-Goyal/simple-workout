import { defineConfig } from "vitest/config";

// Separate from vite.config.ts on purpose: the app config loads the PWA plugin
// and build-time `define`s that tests don't need.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node"
  }
});
