#!/usr/bin/env node
/**
 * Exercise illustration pipeline (see OVERHAUL_PLAN.md, decision 4).
 *
 *   node scripts/import-exercise-media.mjs import  [--only a,b] [--force] [--repin]
 *   node scripts/import-exercise-media.mjs verify  a,b,c
 *   node scripts/import-exercise-media.mjs unverify a,b
 *   node scripts/import-exercise-media.mjs check
 *   node scripts/import-exercise-media.mjs lookup-wger 454 297
 *
 * Sources are pinned in src/v2/media/manifest.json: free-exercise-db by commit
 * sha, wger by the sha256 of the original bytes, local drawings by path. The
 * app never fetches media at runtime; `import` produces WebP frames, `verify`
 * (after a human has eyeballed the review page) promotes them into
 * src/v2/media/ and flips `mediaRef` in ladders.ts, and `check` (run by
 * `npm run build`, Node 20 in CI — keep this file free of newer syntax)
 * refuses to ship anything unverified.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const PATHS = {
  manifest: join(ROOT, "src/v2/media/manifest.json"),
  ladders: join(ROOT, "src/v2/ladders.ts"),
  mediaDir: join(ROOT, "src/v2/media"),
  credits: join(ROOT, "src/v2/media/CREDITS.md"),
  reviewDir: join(ROOT, ".media-review"),
  cacheDir: join(ROOT, ".media-cache"),
  localDir: join(ROOT, "assets/media-src")
};

// Output frame geometry: exact 3:2, ~2.4x DPR for the 180 px-tall card.
const OUT_W = 660;
const OUT_H = 440;
const WEBP_QUALITY = 72;
const MAX_TOTAL_BYTES = 1.6 * 1024 * 1024;
const LICENSES = new Set(["Unlicense", "CC0-1.0", "CC-BY-SA-3.0", "CC-BY-SA-4.0"]);

// ---------------------------------------------------------------- helpers

export function readManifest(path = PATHS.manifest) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeManifest(manifest, path = PATHS.manifest) {
  writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n");
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function frameFile(id, i) {
  return `${id}-${i}.webp`;
}

/** { id -> mediaRef | null } parsed from ladders.ts without executing it. */
export function parseMediaRefs(source) {
  const out = new Map();
  const re = /id: "([^"]+)",[\s\S]*?mediaRef: (null|"[^"]+")/g;
  let m;
  while ((m = re.exec(source))) out.set(m[1], m[2] === "null" ? null : JSON.parse(m[2]));
  return out;
}

function resolveUpstreamUrl(manifest, entry, frame) {
  if (entry.source === "free-exercise-db") {
    const src = manifest.sources["free-exercise-db"];
    if (!/^[0-9a-f]{40}$/.test(src.commit || "")) throw new Error("free-exercise-db commit is not a pinned 40-char sha");
    return `https://raw.githubusercontent.com/${src.repo}/${src.commit}/${frame.upstream}`;
  }
  if (entry.source === "wger") return frame.upstream;
  return null; // local
}

async function fetchWithRetry(url, tries = 3) {
  let lastErr;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      const headers = { "User-Agent": "simple-workout media import (github.com/Rishi-Goyal/simple-workout)" };
      if (process.env.GITHUB_TOKEN && url.includes("raw.githubusercontent.com")) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
    }
  }
  throw lastErr;
}

async function loadOriginal(manifest, entry, frame) {
  const url = resolveUpstreamUrl(manifest, entry, frame);
  if (!url) {
    const p = join(ROOT, frame.upstream);
    if (!existsSync(p)) throw new Error(`local source missing: ${frame.upstream}`);
    return readFileSync(p);
  }
  mkdirSync(PATHS.cacheDir, { recursive: true });
  const ext = (url.match(/\.(\w+)(?:\?|$)/) || [, "bin"])[1];
  const cached = join(PATHS.cacheDir, `${sha256(url)}.${ext}`);
  if (existsSync(cached)) return readFileSync(cached);
  const buf = await fetchWithRetry(url);
  writeFileSync(cached, buf);
  await new Promise((r) => setTimeout(r, 150)); // be polite to raw.githubusercontent
  return buf;
}

async function toWebp(buf, isSvg) {
  const { default: sharp } = await import("sharp");
  const input = isSvg ? sharp(buf, { density: 300 }) : sharp(buf);
  return input
    .flatten({ background: "#ffffff" })
    .resize(OUT_W, OUT_H, { fit: "contain", background: "#ffffff" })
    .webp({ quality: WEBP_QUALITY, effort: 6 })
    .toBuffer();
}

function bundledFrames() {
  if (!existsSync(PATHS.mediaDir)) return [];
  return readdirSync(PATHS.mediaDir).filter((f) => f.endsWith(".webp"));
}

// ------------------------------------------------------------------ check

/** Pure validation; returns a list of problems (empty = ok). */
export function checkMedia({ manifest, laddersSource, mediaFiles }) {
  const errors = [];
  const refs = parseMediaRefs(laddersSource);
  const entries = manifest.entries || {};

  if (!/^[0-9a-f]{40}$/.test(manifest.sources?.["free-exercise-db"]?.commit || "")) {
    errors.push("sources.free-exercise-db.commit must be a pinned 40-char sha");
  }

  for (const [id, entry] of Object.entries(entries)) {
    if (!refs.has(id)) errors.push(`${id}: manifest entry has no exercise in ladders.ts`);
    if (!["free-exercise-db", "wger", "local"].includes(entry.source)) errors.push(`${id}: unknown source ${entry.source}`);
    if (!LICENSES.has(entry.license)) errors.push(`${id}: unknown license ${entry.license}`);
    if (/^CC-BY-SA/.test(entry.license || "")) {
      if (!entry.author) errors.push(`${id}: CC-BY-SA needs an author`);
      if (!entry.licenseUrl) errors.push(`${id}: CC-BY-SA needs a licenseUrl`);
      if (!entry.sourceUrl) errors.push(`${id}: CC-BY-SA needs a sourceUrl`);
    }
    if (!Array.isArray(entry.frames) || entry.frames.length > 2) errors.push(`${id}: frames must be an array of 0..2`);
    const ref = refs.get(id);
    if (entry.verified) {
      if (entry.frames.length === 0) errors.push(`${id}: verified with no frames`);
      if (!entry.verifiedAt) errors.push(`${id}: verified without verifiedAt`);
      if (ref !== id) errors.push(`${id}: verified but ladders.ts mediaRef is ${JSON.stringify(ref)}`);
      entry.frames.forEach((fr, i) => {
        if (!fr.sha256) errors.push(`${id}: verified frame ${i} has no sha256 pin`);
        if (!mediaFiles.includes(frameFile(id, i))) errors.push(`${id}: verified but ${frameFile(id, i)} is not bundled`);
      });
    } else {
      if (ref) errors.push(`${id}: mediaRef set in ladders.ts but manifest entry is not verified`);
      entry.frames.forEach((_, i) => {
        if (mediaFiles.includes(frameFile(id, i))) errors.push(`${id}: unverified but ${frameFile(id, i)} is bundled`);
      });
    }
  }
  for (const [id, ref] of refs) {
    if (ref && !entries[id]) errors.push(`${id}: mediaRef set but no manifest entry`);
    if (ref && ref !== id) errors.push(`${id}: mediaRef must equal the exercise id (got ${ref})`);
  }
  for (const f of mediaFiles) {
    const m = f.match(/^(.+)-(\d+)\.webp$/);
    if (!m) {
      errors.push(`${f}: unexpected file in media dir`);
      continue;
    }
    const entry = entries[m[1]];
    if (!entry || !entry.verified || Number(m[2]) >= entry.frames.length) errors.push(`${f}: bundled frame without a verified manifest frame`);
  }
  return errors;
}

function runCheck() {
  const errors = checkMedia({
    manifest: readManifest(),
    laddersSource: readFileSync(PATHS.ladders, "utf8"),
    mediaFiles: bundledFrames()
  });
  const total = bundledFrames().reduce((n, f) => n + statSync(join(PATHS.mediaDir, f)).size, 0);
  if (total > MAX_TOTAL_BYTES) errors.push(`bundled media is ${(total / 1024).toFixed(0)} KB, over the ${(MAX_TOTAL_BYTES / 1024).toFixed(0)} KB budget`);
  if (errors.length) {
    console.error("media check failed:\n  " + errors.join("\n  "));
    process.exit(1);
  }
  console.log(`media check ok — ${bundledFrames().length} frames, ${(total / 1024).toFixed(0)} KB`);
}

// ----------------------------------------------------------------- credits

function writeCredits(manifest) {
  const entries = Object.entries(manifest.entries).filter(([, e]) => e.verified);
  const fed = entries.filter(([, e]) => e.source === "free-exercise-db");
  const wger = entries.filter(([, e]) => e.source === "wger");
  const local = entries.filter(([, e]) => e.source === "local");
  const src = manifest.sources["free-exercise-db"];
  const lines = [
    "# Exercise illustration credits",
    "",
    "Generated by `scripts/import-exercise-media.mjs` — do not edit by hand.",
    "All frames were resized to 660×440, flattened onto white and converted to WebP.",
    ""
  ];
  if (fed.length) {
    lines.push(`## free-exercise-db (public domain, Unlicense) — ${fed.length} exercises`, "", `${src.url} at commit \`${src.commit}\``, "");
    for (const [id, e] of fed) lines.push(`- \`${id}\` ← ${e.upstreamId} (${e.frames.map((f) => f.upstream).join(", ")})`);
    lines.push("");
  }
  if (wger.length) {
    lines.push(`## wger.de — ${wger.length} exercises`, "", "Derivative WebP frames of CC-BY-SA images remain CC-BY-SA.", "");
    for (const [id, e] of wger) lines.push(`- \`${id}\` ← wger exercise ${e.upstreamId}: ${e.author || "unknown author"}, ${e.license} (${e.licenseUrl || ""}) — ${e.sourceUrl}`);
    lines.push("");
  }
  if (local.length) {
    lines.push(`## Drawn for this app (Unlicense) — ${local.length} exercises`, "");
    for (const [id, e] of local) lines.push(`- \`${id}\` (${e.frames.map((f) => f.upstream).join(", ")})`);
    lines.push("");
  }
  writeFileSync(PATHS.credits, lines.join("\n"));
}

// ------------------------------------------------------------------ import

function parseArgs(argv) {
  const flags = { only: null, force: false, repin: false, positional: [] };
  for (const a of argv) {
    if (a === "--force") flags.force = true;
    else if (a === "--repin") flags.repin = true;
    else if (a.startsWith("--only=")) flags.only = a.slice(7).split(",").filter(Boolean);
    else if (a === "--only") flags.only = "next";
    else if (flags.only === "next") flags.only = a.split(",").filter(Boolean);
    else flags.positional.push(a);
  }
  return flags;
}

async function runImport(flags) {
  const manifest = readManifest();
  mkdirSync(PATHS.reviewDir, { recursive: true });
  mkdirSync(PATHS.mediaDir, { recursive: true });
  const rows = [];
  for (const [id, entry] of Object.entries(manifest.entries)) {
    if (flags.only && !flags.only.includes(id)) continue;
    if (entry.frames.length === 0) {
      rows.push([id, "GAP", "no source frames"]);
      continue;
    }
    const outDir = entry.verified ? PATHS.mediaDir : PATHS.reviewDir;
    const allPresent = entry.frames.every((_, i) => existsSync(join(outDir, frameFile(id, i))));
    if (entry.verified && allPresent && !flags.force) {
      rows.push([id, "skip", "verified & bundled"]);
      continue;
    }
    for (let i = 0; i < entry.frames.length; i++) {
      const frame = entry.frames[i];
      let original;
      try {
        original = await loadOriginal(manifest, entry, frame);
      } catch (e) {
        rows.push([id, "ERROR", `frame ${i}: ${e.message}`]);
        continue;
      }
      const digest = sha256(original);
      if (frame.sha256 && frame.sha256 !== digest) {
        if (!flags.repin) {
          rows.push([id, "PIN MISMATCH", `frame ${i}: upstream bytes changed (use --repin to accept and re-review)`]);
          continue;
        }
        frame.sha256 = digest;
        entry.verified = false;
        entry.verifiedAt = null;
      } else if (!frame.sha256) {
        frame.sha256 = digest;
      }
      const isSvg = /\.svg$/i.test(frame.upstream);
      const webp = await toWebp(original, isSvg);
      const target = entry.verified ? PATHS.mediaDir : PATHS.reviewDir;
      writeFileSync(join(target, frameFile(id, i)), webp);
      rows.push([id, entry.verified ? "bundled" : "review", `frame ${i}: ${(webp.length / 1024).toFixed(1)} KB`]);
    }
  }
  writeManifest(manifest);
  writeCredits(manifest);
  for (const r of rows) console.log(r[0].padEnd(32), r[1].padEnd(13), r[2]);
  const total = bundledFrames().reduce((n, f) => n + statSync(join(PATHS.mediaDir, f)).size, 0);
  console.log(`\nbundled: ${bundledFrames().length} frames, ${(total / 1024).toFixed(0)} KB (budget ${(MAX_TOTAL_BYTES / 1024).toFixed(0)} KB)`);
  if (total > MAX_TOTAL_BYTES) process.exit(1);
  if (rows.some((r) => r[1] === "ERROR" || r[1] === "PIN MISMATCH")) process.exit(1);
}

// ------------------------------------------------------------- verify flow

function setMediaRef(id, value) {
  let src = readFileSync(PATHS.ladders, "utf8");
  const crlf = src.includes("\r\n");
  src = src.replace(/\r\n/g, "\n");
  const re = new RegExp(`(id: "${id}",[\\s\\S]*?mediaRef: )(null|"[^"]+")`, "g");
  const matches = src.match(re) || [];
  if (matches.length !== 1) throw new Error(`${id}: expected exactly one mediaRef block in ladders.ts, found ${matches.length}`);
  src = src.replace(re, `$1${value === null ? "null" : JSON.stringify(value)}`);
  writeFileSync(PATHS.ladders, crlf ? src.replace(/\n/g, "\r\n") : src);
}

function runVerify(ids) {
  if (!ids.length) throw new Error("verify: give a comma-separated list of exercise ids");
  const manifest = readManifest();
  const today = new Date().toISOString().slice(0, 10);
  mkdirSync(PATHS.mediaDir, { recursive: true });
  for (const id of ids) {
    const entry = manifest.entries[id];
    if (!entry) throw new Error(`${id}: no manifest entry`);
    if (entry.frames.length === 0) throw new Error(`${id}: no frames to verify`);
    for (let i = 0; i < entry.frames.length; i++) {
      const from = join(PATHS.reviewDir, frameFile(id, i));
      const to = join(PATHS.mediaDir, frameFile(id, i));
      if (!existsSync(from) && !existsSync(to)) throw new Error(`${id}: ${frameFile(id, i)} not found — run import first`);
      if (existsSync(from)) {
        writeFileSync(to, readFileSync(from));
        rmSync(from);
      }
      if (!entry.frames[i].sha256) throw new Error(`${id}: frame ${i} has no sha256 — run import first`);
    }
    entry.verified = true;
    entry.verifiedAt = today;
    setMediaRef(id, id);
    console.log(`verified ${id}`);
  }
  writeManifest(manifest);
  writeCredits(manifest);
}

function runUnverify(ids) {
  const manifest = readManifest();
  for (const id of ids) {
    const entry = manifest.entries[id];
    if (!entry) throw new Error(`${id}: no manifest entry`);
    entry.verified = false;
    entry.verifiedAt = null;
    for (let i = 0; i < entry.frames.length; i++) {
      const p = join(PATHS.mediaDir, frameFile(id, i));
      if (existsSync(p)) rmSync(p);
    }
    setMediaRef(id, null);
    console.log(`unverified ${id}`);
  }
  writeManifest(manifest);
  writeCredits(manifest);
}

// -------------------------------------------------------------- lookup

async function runLookupWger(ids) {
  for (const id of ids) {
    const res = await fetch(`https://wger.de/api/v2/exerciseinfo/${id}/?format=json`);
    if (!res.ok) throw new Error(`wger ${id}: HTTP ${res.status}`);
    const e = await res.json();
    const t = (e.translations || []).find((x) => x.language === 2);
    console.log(`\n# wger ${e.id} — ${t ? t.name : "?"}  (exercise license ${e.license?.short_name}, author ${e.license_author})`);
    for (const img of e.images || []) {
      console.log(`  image ${img.id}${img.is_main ? " (main)" : ""}: ${img.image}`);
      console.log(`    license ${img.license?.short_name} ${img.license?.url || ""} — author ${img.license_author || "?"}`);
    }
  }
}

// -------------------------------------------------------------------- main

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [cmd = "import", ...rest] = process.argv.slice(2);
  const flags = parseArgs(rest);
  const idList = flags.positional.flatMap((p) => p.split(",")).filter(Boolean);
  try {
    if (cmd === "import") await runImport(flags);
    else if (cmd === "verify") runVerify(idList);
    else if (cmd === "unverify") runUnverify(idList);
    else if (cmd === "check") runCheck();
    else if (cmd === "lookup-wger") await runLookupWger(idList);
    else {
      console.error(`unknown command ${cmd}`);
      process.exit(2);
    }
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
}
