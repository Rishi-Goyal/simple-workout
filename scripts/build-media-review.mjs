#!/usr/bin/env node
/**
 * The human verification gate: writes .media-review/index.html showing every
 * exercise's name, cue and how-to next to its imported frames, with source and
 * license, so each pairing can be eyeballed before `verify` ships it.
 *
 * Local-only (Node ≥ 23 for TypeScript stripping of ladders.ts). Run
 * `npm run media:import` first, then `npm run media:review` and open the page.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { PATHS, readManifest } from "./import-exercise-media.mjs";

const { LADDERS } = await import(pathToFileURL(PATHS.ladders).href);
const manifest = readManifest();
mkdirSync(PATHS.reviewDir, { recursive: true });

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function frameSrc(id, i, verified) {
  const dir = verified ? PATHS.mediaDir : PATHS.reviewDir;
  const file = join(dir, `${id}-${i}.webp`);
  if (!existsSync(file)) return null;
  return relative(PATHS.reviewDir, file).replace(/\\/g, "/");
}

function upstreamLink(entry, frame) {
  if (entry.source === "free-exercise-db") {
    const s = manifest.sources["free-exercise-db"];
    return `https://raw.githubusercontent.com/${s.repo}/${s.commit}/${frame.upstream}`;
  }
  if (entry.source === "wger") return frame.upstream;
  return `../${frame.upstream}`;
}

const cards = [];
for (const L of LADDERS) {
  for (const ex of L.rungs) {
    const e = manifest.entries[ex.id];
    const status = !e || e.frames.length === 0 ? "NO MEDIA" : e.verified ? `VERIFIED ${e.verifiedAt}` : "UNVERIFIED";
    const approx = e?.note?.startsWith("APPROX");
    const frames = (e?.frames ?? []).map((fr, i) => {
      const src = frameSrc(ex.id, i, e.verified);
      const label = e.frames.length === 1 ? "Frame" : i === 0 ? "Start" : "End";
      return `<figure>
        ${src ? `<img src="${esc(src)}" alt="${esc(ex.name)} ${label}">` : `<div class="missing">not imported yet</div>`}
        <figcaption>${label} · <a href="${esc(upstreamLink(e, fr))}" target="_blank" rel="noopener">original</a>${fr.sha256 ? ` · <code>${fr.sha256.slice(0, 10)}</code>` : ""}</figcaption>
      </figure>`;
    });
    cards.push(`<section class="card ${e?.verified ? "ok" : ""} ${approx ? "approx" : ""}" data-id="${esc(ex.id)}">
      <header>
        <span class="meta">${esc(L.label)} · rung ${ex.rung}${ex.canonical ? "" : " · alternate"}</span>
        <h2>${esc(ex.name)}</h2>
        <span class="badge ${e?.verified ? "b-ok" : e?.frames?.length ? "b-warn" : "b-none"}">${esc(status)}</span>
        ${approx ? `<span class="badge b-approx">APPROX</span>` : ""}
      </header>
      <div class="body">
        <div class="text">
          <p class="cue">${esc(ex.cue)}</p>
          <ol>${ex.howTo.map((h) => `<li>${esc(h)}</li>`).join("")}</ol>
          ${e?.note ? `<p class="note">${esc(e.note)}</p>` : ""}
          <p class="src">${e ? `${esc(e.source)}${e.upstreamId ? ` · <code>${esc(e.upstreamId)}</code>` : ""} · ${esc(e.license)}${e.author ? ` · ${esc(e.author)}` : ""}${e.sourceUrl ? ` · <a href="${esc(e.sourceUrl)}" target="_blank" rel="noopener">source page</a>` : ""}` : "no manifest entry"}</p>
        </div>
        <div class="frames">${frames.join("") || `<div class="missing">no frames</div>`}</div>
      </div>
      ${e && e.frames.length && !e.verified ? `<label class="ok-box"><input type="checkbox" data-verify="${esc(ex.id)}"> Looks right — matches the name and how-to</label>` : ""}
    </section>`);
  }
}

const html = `<!doctype html>
<meta charset="utf-8">
<title>Exercise media review</title>
<style>
  body { font: 14px/1.4 system-ui, sans-serif; margin: 0; padding: 24px 24px 120px; background: #f6f7f9; color: #202124; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .intro { color: #5f6368; margin-bottom: 20px; }
  .card { background: #fff; border: 1px solid #dadce0; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px; }
  .card.ok { border-color: #34a853; }
  .card.approx { border-color: #ea8600; }
  header { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
  header h2 { font-size: 20px; margin: 0; }
  .meta { font-size: 12px; letter-spacing: .5px; text-transform: uppercase; color: #5f6368; }
  .badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; }
  .b-ok { background: #e6f4ea; color: #137333; } .b-warn { background: #fef7e0; color: #b06000; }
  .b-none { background: #f1f3f4; color: #5f6368; } .b-approx { background: #fce8e6; color: #c5221f; }
  .body { display: grid; grid-template-columns: minmax(260px, 1fr) minmax(300px, 2fr); gap: 20px; margin-top: 12px; }
  .cue { font-weight: 600; margin: 0 0 6px; }
  ol { margin: 0; padding-left: 20px; } li { margin: 2px 0; }
  .note { color: #c5221f; margin: 8px 0 0; }
  .src { color: #5f6368; font-size: 12px; margin: 8px 0 0; }
  .frames { display: flex; gap: 12px; flex-wrap: wrap; }
  figure { margin: 0; width: 330px; } figure img { width: 330px; height: 220px; object-fit: contain; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; display: block; }
  figcaption { font-size: 12px; color: #5f6368; margin-top: 4px; }
  .missing { width: 330px; height: 220px; display: grid; place-items: center; border: 1px dashed #dadce0; border-radius: 8px; color: #9aa0a6; }
  .ok-box { display: block; margin-top: 12px; }
  #bar { position: fixed; left: 0; right: 0; bottom: 0; background: #202124; color: #fff; padding: 12px 24px; display: flex; gap: 12px; align-items: center; font-family: ui-monospace, monospace; font-size: 12px; }
  #bar code { flex: 1; white-space: nowrap; overflow: auto; }
  #bar button { background: #8ab4f8; color: #202124; border: 0; border-radius: 6px; padding: 8px 14px; font-weight: 600; cursor: pointer; }
  @media (max-width: 800px) { .body { grid-template-columns: 1fr; } }
</style>
<h1>Exercise media review</h1>
<p class="intro">For each card: does the picture show <em>this</em> exercise, as described by the cue and steps? Tick the ones that do, then run the command in the bar. Untick or leave unticked anything doubtful and fix its manifest entry instead.</p>
${cards.join("\n")}
<div id="bar"><span>verify:</span><code id="cmd">node scripts/import-exercise-media.mjs verify …</code><button id="copy">Copy</button></div>
<script>
  const KEY = "media-review-ticks";
  const ticks = new Set(JSON.parse(localStorage.getItem(KEY) || "[]"));
  const boxes = [...document.querySelectorAll("input[data-verify]")];
  for (const b of boxes) b.checked = ticks.has(b.dataset.verify);
  function render() {
    const ids = boxes.filter((b) => b.checked).map((b) => b.dataset.verify);
    localStorage.setItem(KEY, JSON.stringify(ids));
    document.getElementById("cmd").textContent = ids.length ? "node scripts/import-exercise-media.mjs verify " + ids.join(",") : "tick cards to build the verify command";
  }
  for (const b of boxes) b.addEventListener("change", render);
  document.getElementById("copy").onclick = () => navigator.clipboard.writeText(document.getElementById("cmd").textContent);
  render();
</script>
`;
writeFileSync(join(PATHS.reviewDir, "index.html"), html);
console.log(`wrote ${join(PATHS.reviewDir, "index.html")} (${cards.length} cards)`);
