import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/simple-workout/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Simple Workout",
        short_name: "Workout",
        description: "Push / Pull / Legs tracker with adaptive recommendations",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        start_url: "/simple-workout/",
        scope: "/simple-workout/",
        // SVG icon for v1 — replace with PNG 192/512/512-maskable before
        // shipping to iOS users (Safari home-screen icons need PNG).
        icons: [
          { src: "favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,wasm}"],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024
      }
    })
  ],
  optimizeDeps: {
    exclude: ["@sqlite.org/sqlite-wasm"]
  },
  worker: {
    format: "es"
  },
  // No COOP/COEP headers needed: we use the OPFS SAH Pool VFS, which
  // works without cross-origin isolation (important — GitHub Pages
  // cannot set those headers).
  server: {}
});
