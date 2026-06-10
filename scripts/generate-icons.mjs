// Rasterizes public/favicon.svg into the PNG icons the PWA manifest needs.
// Run with: node scripts/generate-icons.mjs
import sharp from "sharp";
import { readFile } from "node:fs/promises";

const svg = await readFile(new URL("../public/favicon.svg", import.meta.url));
const out = (name) => new URL(`../public/${name}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const BG = "#0f172a";

async function plain(size, name) {
  await sharp(svg, { density: 72 * (size / 64) })
    .resize(size, size)
    .png()
    .toFile(out(name));
  console.log("wrote", name);
}

// Maskable: full-bleed background with the artwork shrunk into the 80% safe zone.
async function maskable(size, name) {
  const inner = Math.round(size * 0.8);
  const art = await sharp(svg, { density: 72 * (inner / 64) })
    .resize(inner, inner)
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: BG }
  })
    .composite([{ input: art, gravity: "center" }])
    .png()
    .toFile(out(name));
  console.log("wrote", name);
}

await plain(192, "pwa-192x192.png");
await plain(512, "pwa-512x512.png");
await maskable(512, "maskable-512x512.png");
// iOS home-screen icon; opaque background (iOS fills transparency with black).
await maskable(180, "apple-touch-icon-180x180.png");
