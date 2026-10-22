#!/usr/bin/env node
/* annotate.mjs — the annotated page of an /lsg:assess assessment.
 *
 * Reads <dir>/regions.json and <dir>/figma.png, writes <dir>/assessment.html: the screenshot with
 * every region outlined, numbered and coloured by outcome, beside the regions table. One
 * self-contained file (the image is embedded), ready to publish as an Artifact.
 *
 * regions.json:
 *   { "name": "Orders list", "figma": "<url>", "frame": { "width": 1440, "height": 1024 },
 *     "regions": [ { "n": 1, "name": "Header", "outcome": "reuse", "x": 0, "y": 0, "w": 1440,
 *                    "h": 64, "match": "pat-layout-side", "plan": "" } ] }
 * x / y / w / h are in frame units (the frame's own pixels, whatever the screenshot's scale).
 * outcome: reuse | variant | coming | osui | custom | screen
 *
 * Usage: node <plugin>/skills/assess/scripts/annotate.mjs <assessment-dir>   exit 0 ok · 1 error */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir || !existsSync(join(dir, "regions.json"))) {
  console.error("usage: annotate.mjs <assessment-dir>  (needs regions.json and figma.png in it)");
  process.exit(1);
}
const data = JSON.parse(readFileSync(join(dir, "regions.json"), "utf8"));
const png = join(dir, "figma.png");
if (!existsSync(png)) {
  console.error(`missing ${png} — save the frame's get_screenshot there first`);
  process.exit(1);
}
const { width: fw, height: fh } = data.frame || {};
if (!fw || !fh) {
  console.error("regions.json needs frame.width and frame.height");
  process.exit(1);
}

const OUTCOMES = {
  reuse: "Reuse",
  variant: "Reuse + variant",
  coming: "Coming",
  osui: "New from OutSystems UI",
  custom: "New custom",
  screen: "Screen-only",
};
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const regions = data.regions || [];
const bad = regions.filter((r) => !OUTCOMES[r.outcome]);
if (bad.length) {
  console.error(`unknown outcome on region(s) ${bad.map((r) => r.n).join(", ")} — use ${Object.keys(OUTCOMES).join(" | ")}`);
  process.exit(1);
}
const pct = (v, of) => `${((v / of) * 100).toFixed(3)}%`;
const counts = Object.fromEntries(Object.keys(OUTCOMES).map((k) => [k, regions.filter((r) => r.outcome === k).length]));
const img = readFileSync(png).toString("base64");
const title = `Assessment — ${data.name || "design"}`;

const boxes = regions
  .map((r) => `<a class="box o-${r.outcome}" href="#r${r.n}" data-n="${r.n}" style="left:${pct(r.x, fw)};top:${pct(r.y, fh)};width:${pct(r.w, fw)};height:${pct(r.h, fh)}" aria-label="${esc(`${r.n}. ${r.name}: ${OUTCOMES[r.outcome]}`)}"><span>${r.n}</span></a>`)
  .join("\n");
const rows = regions
  .map((r) => `<tr id="r${r.n}" data-n="${r.n}"><td class="num">${r.n}</td><td>${esc(r.name)}</td><td><span class="tag o-${r.outcome}">${OUTCOMES[r.outcome]}</span></td><td>${esc(r.match)}</td><td>${esc(r.plan)}</td></tr>`)
  .join("\n");
const legend = Object.entries(OUTCOMES)
  .filter(([k]) => counts[k])
  .map(([k, label]) => `<li><span class="tag o-${k}">${label}</span> ${counts[k]}</li>`)
  .join("");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
:root {
  --bg: #ffffff; --surface: #f5f5f4; --text: #1c1c1e; --muted: #5c5c62; --line: #dcdcde;
  --reuse: #1a7f37; --variant: #0a6fb8; --coming: #6e6e73; --osui: #8250df; --custom: #c2410c; --screen: #8a6d00;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #161618; --surface: #222225; --text: #f2f2f4; --muted: #a8a8ae; --line: #3a3a3e;
    --reuse: #4ac26b; --variant: #54aeff; --coming: #a8a8ae; --osui: #c297ff; --custom: #fb8f44; --screen: #e3b341;
  }
}
:root[data-theme="dark"] {
  --bg: #161618; --surface: #222225; --text: #f2f2f4; --muted: #a8a8ae; --line: #3a3a3e;
  --reuse: #4ac26b; --variant: #54aeff; --coming: #a8a8ae; --osui: #c297ff; --custom: #fb8f44; --screen: #e3b341;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 1400px; margin: 0 auto; padding: 32px 16px 64px; }
h1 { font-size: 28px; margin: 0 0 4px; }
.meta { color: var(--muted); margin: 0 0 20px; overflow-wrap: anywhere; }
.legend { display: flex; flex-wrap: wrap; gap: 8px 20px; list-style: none; padding: 0; margin: 0 0 20px; }
.layout { display: grid; grid-template-columns: 1fr; gap: 24px; align-items: start; }
@media (min-width: 1200px) {
  .layout { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); }
  figure { position: sticky; top: 16px; }
}
figure { margin: 0; position: relative; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; background: var(--surface); }
figure img { display: block; width: 100%; height: auto; }
.box { position: absolute; border: 2px solid var(--c); background: color-mix(in srgb, var(--c) 10%, transparent); border-radius: 3px; text-decoration: none; }
.box span { position: absolute; top: -1px; left: -1px; min-width: 22px; padding: 0 5px; font: 600 12px/20px system-ui, sans-serif; text-align: center; color: #fff; background: var(--c); border-radius: 2px 0 3px 0; }
.box.on, .box:focus-visible { outline: 3px solid var(--text); outline-offset: 1px; z-index: 2; }
.o-reuse { --c: var(--reuse); } .o-variant { --c: var(--variant); } .o-coming { --c: var(--coming); }
.o-osui { --c: var(--osui); } .o-custom { --c: var(--custom); } .o-screen { --c: var(--screen); }
.tag { display: inline-block; padding: 0 8px; border-radius: 10px; font-size: 13px; font-weight: 600; color: var(--c); border: 1px solid var(--c); white-space: nowrap; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { text-align: left; vertical-align: top; padding: 8px; border-bottom: 1px solid var(--line); }
th { color: var(--muted); font-weight: 600; }
td.num { font-weight: 600; }
tr.on td { background: var(--surface); }
</style>
</head>
<body>
<main>
<h1>${esc(title)}</h1>
<p class="meta">${data.figma ? `Figma: <a href="${esc(data.figma)}">${esc(data.figma)}</a> · ` : ""}${regions.length} regions</p>
<ul class="legend">${legend}</ul>
<div class="layout">
<figure>
<img src="data:image/png;base64,${img}" alt="${esc(data.name || "The assessed frame")}, with each region outlined">
${boxes}
</figure>
<div class="table-wrap">
<table>
<thead><tr><th>#</th><th>Region</th><th>Outcome</th><th>Matches / built from</th><th>Plan</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
</div>
</div>
</main>
<script>
const mark = (n, on) => document.querySelectorAll('[data-n="' + n + '"]').forEach((el) => el.classList.toggle("on", on));
document.querySelectorAll("[data-n]").forEach((el) => {
  el.addEventListener("mouseenter", () => mark(el.dataset.n, true));
  el.addEventListener("mouseleave", () => mark(el.dataset.n, false));
});
</script>
</body>
</html>
`;
writeFileSync(join(dir, "assessment.html"), html);
console.log(`wrote ${join(dir, "assessment.html")} — ${regions.length} regions: ${Object.entries(counts).filter(([, v]) => v).map(([k, v]) => `${v} ${k}`).join(", ")}`);
