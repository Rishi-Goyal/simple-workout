/// <reference types="vite/client" />

// Build-time constants injected by vite.config.ts `define`.
declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;

/** Illustration credits for verified exercise media (built from src/v2/media/manifest.json). */
declare const __MEDIA_CREDITS__: {
  fed: { commit: string; url: string; count: number } | null;
  wger: { exerciseId: string; upstreamId: string; author: string | null; license: string; licenseUrl: string | null; sourceUrl: string | null }[];
  local: number;
};
