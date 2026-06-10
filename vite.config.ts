import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/simple-workout/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "Simple Workout",
        short_name: "Workout",
        description: "Push / Pull / Legs tracker with adaptive recommendations",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        start_url: "/simple-workout/",
        scope: "/simple-workout/",
        // Chrome on Android requires real 192/512 PNG bitmaps for the
        // install prompt (WebAPK minting); the SVG alone is not enough.
        icons: [
          { src: "favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
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
