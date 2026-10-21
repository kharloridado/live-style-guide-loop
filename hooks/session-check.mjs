#!/usr/bin/env node
/* SessionStart: name the setup steps a fresh clone or worktree is missing, before the first
 * build fails on them. Silent when everything is in place. */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readInput, projectRoot, isUnfilledTemplate } from "./lib.mjs";

const input = await readInput();
const dir = projectRoot(input);
if (!dir) process.exit(0);

const missing = [];
if (isUnfilledTemplate(dir)) {
  missing.push("project.config.json still holds <<PLACEHOLDER>> values — run /lsg:project-setup.");
}
if (!existsSync(join(dir, "node_modules"))) missing.push("dependencies are not installed — run `npm install`.");
const osui = join(dir, "vendor", "outsystems-ui");
if (!existsSync(osui) || readdirSync(osui).length === 0) {
  missing.push("the OutSystems UI submodule is empty — run `git submodule update --init vendor/outsystems-ui`.");
}
if (!existsSync(join(dir, "review", "vendor", "outsystems-ui", "outsystems-ui.css"))) {
  missing.push("the OutSystems UI base is not built — run `npm run build:osui` (build:theme and the fidelity gate need it).");
}
if (!existsSync(join(dir, "vendor", "outsystems-frontend-skills", "ui-frameworks", "outsystems-ui", "blocks-index.md"))) {
  missing.push("the platform-knowledge pack is missing at vendor/outsystems-frontend-skills — the skills cannot look up blocks.");
}
if (!missing.length) process.exit(0);

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: `This project's setup is incomplete:\n- ${missing.join("\n- ")}`,
    },
  })
);
