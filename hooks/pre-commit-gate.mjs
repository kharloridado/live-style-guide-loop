#!/usr/bin/env node
/* PreToolUse(Bash): before `git commit`, run `npm run build:theme` when the change touches the
 * design system, and block the commit (exit 2) with the build's own errors when it fails. */
import { execFileSync, spawnSync } from "node:child_process";
import { readInput, projectRoot, isUnfilledTemplate } from "./lib.mjs";

const GATED = /^(tokens|src|specs|build)\//;

const input = await readInput();
const command = input.tool_input?.command ?? "";
if (!/\bgit\s+(?:-C\s+\S+\s+)?commit\b/.test(command)) process.exit(0);

const dir = projectRoot(input);
if (!dir || isUnfilledTemplate(dir)) process.exit(0);

/* Staged and unstaged both count: `git add … && git commit` stages after this hook runs. */
let changed = [];
try {
  changed = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: dir, encoding: "utf8" })
    .split("\n")
    .map((l) => l.slice(3).split(" -> ").pop())
    .filter(Boolean);
} catch {
  process.exit(0);
}
if (!changed.some((p) => GATED.test(p))) process.exit(0);

const run = spawnSync("npm", ["run", "--silent", "build:theme"], {
  cwd: dir,
  encoding: "utf8",
  shell: process.platform === "win32",
});
if (run.status === 0) process.exit(0);

const out = `${run.stdout ?? ""}${run.stderr ?? ""}`.trim().split("\n").slice(-40).join("\n");
process.stderr.write(
  `Commit blocked: \`npm run build:theme\` failed, and a commit touching tokens/, src/, specs/ or build/ needs it green.\n\n` +
    `${out}\n\nFix what it reports, re-run \`npm run build:theme\` until it exits 0, then commit again.\n`
);
process.exit(2);
