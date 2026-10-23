#!/usr/bin/env node
/* probe.mjs — read-only scan of a published OutSystems app's screens, for /lsg:ui-audit.
 *
 * For each URL it records what the running page proves, without guessing at intent:
 *   sheets            every stylesheet, classified as framework (OutSystems UI) or app
 *   inlineStyles      elements carrying a style attribute; frameworkSet marks the ones OutSystems UI
 *                     patterns write themselves (custom properties only, or an osui- element)
 *   hardcoded         literal colours and lengths in the app's own CSS, each with the existing
 *                     custom property that already resolves to the same value, when one does
 *   important         !important declarations in the app's own CSS
 *   duplicateClasses  app classes whose declarations (variables resolved) equal a class the
 *                     framework or the app already defines — "this class already exists"
 *   lookalikes        app elements named like an OutSystems UI pattern (tabs, card, modal…) that
 *                     are not that pattern — candidates for "this component already exists"
 *   containerControls a div or span with a click listener or a control role — a Container
 *                     standing in for a widget
 *   fakeHeadings      text styled like a heading that is not an h1–h6
 *   gridTables        elements with role="grid" (the ODC Table widget's default) holding no
 *                     control at all — a read-only table announced as an interactive grid
 *   blocks            Block instances on the screen (data-block) and how often each is used
 *   repeats           (across all URLs) the same element structure in two or more places that is
 *                     not one Block — "used more than once, so it must be a Block". Rows of one
 *                     List count once; a bare OutSystems UI pattern counts as a leaf
 *
 * Usage (run from a project with playwright or playwright-core installed):
 *   node <plugin>/skills/ui-audit/scripts/probe.mjs --out <dir> [--storage-state <file>]
 *        [--viewport 1440x900] [--min-nodes 5] <url> [<url> …]
 * CHROMIUM_PATH overrides the browser executable. Writes <dir>/probe.json; exit 0 ok · 1 error */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const out = opt("out") || "ui-audit";
const storageState = opt("storage-state");
const [vw, vh] = (opt("viewport") || "1440x900").split("x").map(Number);
const minNodes = Number(opt("min-nodes") || 5);
const urls = args.filter((a) => /^https?:|^file:/.test(a));
if (!urls.length) {
  console.error("usage: probe.mjs --out <dir> [--storage-state <file>] [--viewport WxH] <url> [<url> …]");
  process.exit(1);
}

const req = createRequire(join(process.cwd(), "noop.js"));
let chromium;
for (const pkg of ["playwright", "playwright-core"]) {
  try { ({ chromium } = req(pkg)); break; } catch {}
}
if (!chromium) {
  console.error("playwright is not installed in this project — run `npm install` first.");
  process.exit(1);
}
const executablePath =
  process.env.CHROMIUM_PATH || (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);

/* Runs inside the page: everything is read from the live DOM and CSSOM. */
function scan(fetched, minNodes) {
  const FRAMEWORK = /outsystemsui|outsystems-ui|osui/i;
  const PATTERNS = {
    accordion: "Accordion", tabs: "Tabs", tab: "Tabs", modal: "Popup", dialog: "Popup", popup: "Popup",
    dropdown: "Dropdown", tooltip: "Tooltip", carousel: "Carousel", slider: "Carousel / RangeSlider",
    stepper: "Wizard", wizard: "Wizard", badge: "Badge", chip: "Tag", tag: "Tag", card: "Card",
    alert: "Alert", banner: "Alert", toast: "FeedbackMessage", snackbar: "FeedbackMessage",
    pagination: "Pagination", pager: "Pagination", breadcrumb: "Breadcrumbs", drawer: "Sidebar",
    sidebar: "Sidebar", progress: "ProgressBar / ProgressCircle", rating: "Rating", stars: "Rating",
    datepicker: "DatePicker", calendar: "DatePicker", timepicker: "TimePicker", avatar: "UserAvatar",
    notification: "Notification", search: "Search", gallery: "Gallery", timeline: "Timeline",
  };
  const root = getComputedStyle(document.documentElement);
  const rootPx = parseFloat(root.fontSize) || 16;
  const pathOf = (el) => {
    const parts = [];
    for (let n = el; n && n.nodeType === 1 && parts.length < 5; n = n.parentElement) {
      let p = n.tagName.toLowerCase();
      if (n.id) p += `#${n.id}`;
      const cls = [...n.classList].slice(0, 3).join(".");
      if (cls) p += `.${cls}`;
      parts.unshift(p);
    }
    return parts.join(" > ");
  };

  /* Root custom properties and their resolved values: what "already exists" to reuse. */
  const vars = {};
  const sheets = [];
  const rules = [];
  const visit = (list, origin, href) => {
    for (const r of list) {
      if (r.cssRules && !r.selectorText) { visit(r.cssRules, origin, href); continue; }
      if (!r.selectorText || !r.style) continue;
      rules.push({ r, origin, href });
      if (/^(:root|html)$/.test(r.selectorText.trim())) {
        for (let i = 0; i < r.style.length; i++) {
          const n = r.style[i];
          if (n.startsWith("--")) vars[n] = root.getPropertyValue(n).trim();
        }
      }
    }
  };
  for (const s of document.styleSheets) {
    const href = s.href || "(inline <style>)";
    const origin = FRAMEWORK.test(href) ? "framework" : "app";
    let list;
    try { list = s.cssRules; } catch {
      /* A cross-origin sheet hides its rules from the page; parse the copy fetched with the session. */
      if (fetched[href] == null) { sheets.push({ href, origin, readable: false }); continue; }
      const copy = new CSSStyleSheet();
      copy.replaceSync(fetched[href]);
      list = copy.cssRules;
    }
    sheets.push({ href, origin, readable: true, rules: list.length });
    visit(list, origin, href);
  }
  const frameworkClasses = new Set();
  for (const { r, origin } of rules) {
    if (origin === "framework") for (const m of r.selectorText.matchAll(/\.([\w-]+)/g)) frameworkClasses.add(m[1]);
  }

  const resolve = (value) =>
    value.replace(/var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)/g, (m, n) => vars[n] || root.getPropertyValue(n).trim() || m);
  const norm = (v) => v.replace(/\s+/g, " ").trim().toLowerCase();

  /* One canonical form per value, so #fff, #ffffff and rgb(255,255,255) — or 1rem and 16px — meet. */
  const probe = document.createElement("div");
  probe.style.display = "none";
  document.body.appendChild(probe);
  const canon = (v) => {
    const s = norm(v);
    if (/^(#|rgb|hsl)/.test(s)) {
      probe.style.color = "";
      probe.style.color = s;
      return probe.style.color ? `c:${getComputedStyle(probe).color}` : null;
    }
    const m = s.match(/^(-?\d*\.?\d+)(px|rem|em)$/);
    if (m) return `l:${+(parseFloat(m[1]) * (m[2] === "px" ? 1 : rootPx)).toFixed(2)}`;
    return null;
  };
  const valueToVars = {};
  for (const [n, v] of Object.entries(vars)) {
    const k = canon(v);
    if (k) (valueToVars[k] ||= []).push(n);
  }
  /* The same value under an unrelated name is not a reuse: 16px padding is not --font-size-base. */
  const FAMILIES = [
    [/color|background|fill|stroke|shadow/, /color|bg|background/],
    [/^(margin|padding|gap|row-gap|column-gap|inset|top|right|bottom|left)/, /space|spacing|gap/],
    [/^font-size/, /font-size|text/],
    [/radius/, /radius/],
    [/^border|outline/, /border|color/],
  ];
  const variableFor = (prop, literal) => {
    const names = valueToVars[canon(literal)] || [];
    const fam = FAMILIES.find(([p]) => p.test(prop));
    const fit = fam ? names.find((n) => fam[1].test(n)) : null;
    return { existingVariable: fit || null, sameValue: names.filter((n) => n !== fit).slice(0, 3) };
  };

  /* Signature form: variables resolved, then every colour and length in one unit. */
  const sigValue = (v) =>
    norm(resolve(v)).replace(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|-?\d*\.?\d+(?:px|rem|em)\b/gi, (m) => canon(m) || m);
  const LITERAL = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|-?\d*\.?\d+(?:px|rem|em)\b/gi;
  const hardcoded = [];
  const important = [];
  const signatures = new Map();
  for (const { r, origin, href } of rules) {
    const sel = r.selectorText;
    /* cssText keeps shorthands as written: one padding finding, not four longhands, and a
     * shorthand built from var() keeps its value (its longhands read back empty). */
    const decls = [];
    for (const d of r.style.cssText.split(/;(?![^(]*\))/)) {
      const at = d.indexOf(":");
      if (at === -1) continue;
      const prop = d.slice(0, at).trim();
      const value = d.slice(at + 1).trim();
      if (!prop || prop.startsWith("--")) continue;
      const imp = /!\s*important$/i.test(value);
      decls.push({ prop, raw: value.replace(/\s*!\s*important$/i, ""), imp });
    }
    if (/^\.[\w-]+$/.test(sel.trim()) && decls.length) {
      const sig = decls.map((d) => `${d.prop}:${sigValue(d.raw)}`).sort().join(";");
      if (!signatures.has(sig)) signatures.set(sig, []);
      signatures.get(sig).push({ cls: sel.trim(), origin, href });
    }
    if (origin !== "app") continue;
    for (const { prop, raw, imp } of decls) {
      if (imp) important.push({ href, selector: sel, declaration: `${prop}: ${raw} !important` });
      const lits = (raw.replace(/var\([^)]*\)/g, "").match(LITERAL) || []).filter((l) => !/^-?0+(\.0+)?(px|rem|em)$|^1px$/i.test(l));
      if (lits.length) {
        const literals = lits.map((l) => ({ literal: l, ...variableFor(prop, l) }));
        hardcoded.push({ href, selector: sel, declaration: `${prop}: ${raw}`, literals });
      }
    }
  }
  const duplicateClasses = [];
  for (const [sig, defs] of signatures) {
    const app = defs.filter((d) => d.origin === "app");
    if (!app.length || defs.length < 2) continue;
    /* Prefer the framework class whose name says what it does: .display-flex over .chat. */
    const said = (c) => c.slice(1).split("-").filter((w) => sig.includes(w)).length;
    const framework = defs.filter((d) => d.origin === "framework").map((d) => d.cls).sort((a, b) => said(b) - said(a));
    for (const d of app) {
      const others = defs.filter((o) => o !== d).map((o) => `${o.cls} (${o.origin})`);
      if (!framework.length && others.every((o) => o.startsWith(`${d.cls} `))) continue;
      duplicateClasses.push({ cls: d.cls, href: d.href, declarations: sig, alreadyDefinedBy: others, reuse: framework[0] || others[0] });
    }
  }

  const inlineStyles = [...document.querySelectorAll("[style]")]
    .filter((el) => el !== probe && el.getAttribute("style").trim())
    .map((el) => {
      const style = el.getAttribute("style").trim();
      const onlyVars = style.split(";").filter((d) => d.trim()).every((d) => d.trim().startsWith("--"));
      const frameworkSet = onlyVars || !!el.closest("[class*='osui-']");
      return { element: pathOf(el), style, frameworkSet };
    });

  const lookalikes = [];
  const seen = new Set();
  for (const el of document.querySelectorAll("body [class]")) {
    if (el.closest("[class*='osui-']")) continue;
    for (const c of el.classList) {
      if (frameworkClasses.has(c)) continue;
      const word = c.toLowerCase().split(/[-_]+/).find((w) => PATTERNS[w]);
      if (!word) continue;
      const key = `${c}|${el.tagName}`;
      if (seen.has(key)) break;
      seen.add(key);
      lookalikes.push({ element: pathOf(el), cls: c, osuiPattern: PATTERNS[word], count: document.getElementsByClassName(c).length });
      break;
    }
  }

  const fakeHeadings = [];
  for (const el of document.querySelectorAll("body *")) {
    if (/^(H[1-6]|SCRIPT|STYLE|SVG|BUTTON|A|LABEL|INPUT|TEXTAREA|SELECT|OPTION)$/.test(el.tagName)) continue;
    if (el.closest("h1,h2,h3,h4,h5,h6,button,a,label,[role=heading]")) continue;
    const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
    if (!text || text.length > 80) continue;
    const cs = getComputedStyle(el);
    if (parseFloat(cs.fontSize) >= 20 && parseInt(cs.fontWeight, 10) >= 600) {
      fakeHeadings.push({ element: pathOf(el), text: text.slice(0, 60), fontSize: cs.fontSize, fontWeight: cs.fontWeight });
    }
  }
  const gridTables = [];
  for (const el of document.querySelectorAll('[role="grid"]')) {
    if (el.querySelector("input,select,textarea,button,a[href],[tabindex]:not([tabindex='-1']),[contenteditable]")) continue;
    gridTables.push({ element: pathOf(el), rows: el.querySelectorAll("tr,[role=row]").length });
  }
  probe.remove();

  /* Structure signatures: tag and stable classes, children in order, text ignored (text is what a
   * Block's inputs vary). An OutSystems UI pattern is a leaf: using one twice is not a repeat,
   * wrapping it the same way twice is. */
  const STATE = /^(active|selected|open|opened|closed|disabled|hidden|focus|focused|hover|is-.*|has-.*|ng-.*|ss-.*)$/i;
  const hash = (str) => { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  /* The Block an element belongs to. Content in a placeholder (.ph) is the caller's, not the
   * Block's: a card pasted into a Layout's MainContent is the screen's markup. */
  const ownerBlock = (el) => {
    let skip = 0;
    for (let n = el.parentElement; n; n = n.parentElement) {
      if (n.classList.contains("ph")) skip++;
      else if (n.matches("[data-block]")) { if (skip) skip--; else return n.getAttribute("data-block"); }
    }
    return "";
  };
  const nodes = new Map();
  let uid = 0;
  const sign = (el) => {
    const tag = el.tagName.toLowerCase();
    const cls = [...el.classList].filter((c) => !STATE.test(c)).sort().join(".");
    if (/^(script|style|svg|noscript|template)$/.test(tag) || [...el.classList].some((c) => /^osui-[a-z-]+$/.test(c) && !c.includes("__"))) {
      return { sig: `${tag}.${cls}`, size: 1 };
    }
    let size = 1;
    const kids = [];
    for (const k of el.children) { const r = sign(k); kids.push(r.sig); size += r.size; }
    const sig = hash(`${tag}.${cls}(${kids.join(",")})`);
    if (size >= minNodes && !el.matches("[data-block]")) {
      const parent = el.parentElement;
      if (!parent.dataset.lsgUid) parent.dataset.lsgUid = String(++uid);
      const entry = nodes.get(sig) || { sig, size, count: 0, parents: new Set(), blocks: new Set(), element: pathOf(el), html: el.outerHTML.slice(0, 240), parentSigs: new Set() };
      entry.count++;
      entry.parents.add(parent.dataset.lsgUid);
      entry.blocks.add(ownerBlock(el));
      nodes.set(sig, entry);
      el.dataset.lsgSig = sig;
    }
    return { sig, size };
  };
  sign(document.body);
  for (const e of nodes.values()) {
    const first = document.querySelector(`[data-lsg-sig="${e.sig}"]`);
    const up = first?.parentElement?.closest("[data-lsg-sig]");
    if (up) e.parentSigs.add(up.dataset.lsgSig);
  }
  document.querySelectorAll("[data-lsg-sig]").forEach((el) => el.removeAttribute("data-lsg-sig"));
  document.querySelectorAll("[data-lsg-uid]").forEach((el) => el.removeAttribute("data-lsg-uid"));
  const structures = [...nodes.values()].map((e) => ({
    sig: e.sig, size: e.size, count: e.count, placements: e.parents.size, element: e.element, html: e.html,
    blocks: [...e.blocks], parentSigs: [...e.parentSigs],
  }));
  const blocks = {};
  for (const el of document.querySelectorAll("[data-block]")) {
    const n = el.getAttribute("data-block");
    blocks[n] = (blocks[n] || 0) + 1;
  }

  return {
    title: document.title, url: location.href, variables: Object.keys(vars).length, sheets,
    inlineStyles, hardcoded, important, duplicateClasses, lookalikes, fakeHeadings, gridTables, blocks, structures,
  };
}

const browser = await chromium.launch({ executablePath });
const context = await browser.newContext({ viewport: { width: vw, height: vh }, ...(storageState ? { storageState } : {}) });
const pages = [];
let failed = 0;
for (const url of urls) {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    const hidden = await page.evaluate(() =>
      [...document.styleSheets].filter((s) => { try { s.cssRules; return false; } catch { return !!s.href; } }).map((s) => s.href));
    const fetched = {};
    for (const href of hidden) {
      try {
        if (href.startsWith("file:")) fetched[href] = readFileSync(fileURLToPath(href), "utf8");
        else { const res = await context.request.get(href); if (res.ok()) fetched[href] = await res.text(); }
      } catch {}
    }
    const result = await page.evaluate(`(${scan})(${JSON.stringify(fetched)}, ${minNodes})`);

    const cdp = await context.newCDPSession(page);
    const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
    const { nodeIds } = await cdp.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: "div, span" });
    const containerControls = [];
    for (const nodeId of nodeIds.slice(0, 4000)) {
      const { object } = await cdp.send("DOM.resolveNode", { nodeId });
      const { listeners } = await cdp.send("DOMDebugger.getEventListeners", { objectId: object.objectId });
      const click = listeners.some((l) => l.type === "click");
      const { attributes = [] } = await cdp.send("DOM.getAttributes", { nodeId });
      const attr = {};
      for (let i = 0; i < attributes.length; i += 2) attr[attributes[i]] = attributes[i + 1];
      const role = /^(button|link|tab|checkbox|switch|menuitem)$/.test(attr.role || "") ? attr.role : null;
      if (click || role) {
        const { outerHTML } = await cdp.send("DOM.getOuterHTML", { nodeId });
        containerControls.push({ clickListener: click, role, tabindex: attr.tabindex ?? null, html: outerHTML.slice(0, 200) });
      }
      await cdp.send("Runtime.releaseObject", { objectId: object.objectId });
    }
    pages.push({ ...result, containerControls });
    console.log(JSON.stringify({
      url, title: result.title, inline: result.inlineStyles.filter((s) => !s.frameworkSet).length,
      hardcoded: result.hardcoded.length, important: result.important.length, duplicates: result.duplicateClasses.length,
      lookalikes: result.lookalikes.length, containerControls: containerControls.length, fakeHeadings: result.fakeHeadings.length,
      gridTables: result.gridTables.length,
      blocks: Object.keys(result.blocks).length,
    }));
  } catch (e) {
    failed++;
    pages.push({ url, error: e.message });
    console.log(JSON.stringify({ url, error: e.message }));
  } finally {
    await page.close();
  }
}
await browser.close();

/* Across every screen: a structure in two or more places (rows of one List are one place) that is
 * not already the root of one Block. Only the outermost repeat is kept. */
const bySig = new Map();
for (const p of pages) {
  for (const st of p.structures || []) {
    const e = bySig.get(st.sig) || { sig: st.sig, size: st.size, placements: 0, uses: 0, screens: [], blocks: new Set(), parentSigs: new Set(), element: st.element, html: st.html };
    e.placements += st.placements;
    e.uses += st.count;
    e.screens.push({ url: p.url, title: p.title, uses: st.count, placements: st.placements });
    st.blocks.forEach((b) => e.blocks.add(b));
    st.parentSigs.forEach((s) => e.parentSigs.add(s));
    bySig.set(st.sig, e);
  }
  delete p.structures;
}
const repeated = [...bySig.values()].filter((e) => e.placements >= 2 && !(e.blocks.size === 1 && !e.blocks.has("")));
const repeatedSigs = new Map(repeated.map((e) => [e.sig, e]));
const repeats = repeated
  .filter((e) => ![...e.parentSigs].some((s) => repeatedSigs.get(s)?.placements >= e.placements))
  .map((e) => ({
    element: e.element, nodes: e.size, placements: e.placements, uses: e.uses, screens: e.screens,
    alreadyBlock: [...e.blocks].filter(Boolean), html: e.html,
  }))
  .sort((a, b) => b.nodes * b.placements - a.nodes * a.placements);
console.log(JSON.stringify({ repeats: repeats.length }));

mkdirSync(out, { recursive: true });
writeFileSync(join(out, "probe.json"), JSON.stringify({ probedAt: new Date().toISOString(), viewport: `${vw}x${vh}`, minNodes, repeats, pages }, null, 2));
console.log(`wrote ${join(out, "probe.json")}`);
process.exit(failed === urls.length ? 1 : 0);
