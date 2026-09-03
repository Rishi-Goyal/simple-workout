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
        theme_color: "#1A73E8",
        background_color: "#1A73E8",
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
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        // Google Fonts (Roboto, Google Sans Flex, Material Symbols icons)
        // must survive offline — the icon font renders as raw ligature text
        // without it.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
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
