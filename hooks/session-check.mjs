#!/usr/bin/env node
/* SessionStart: name the setup steps a fresh clone or worktree is missing, before the first
 * build fails on them. Silent when everything is in place. */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { readInput, projectRoot, isUnfilledTemplate } from "./lib.mjs";

const input = await readInput();
const dir = projectRoot(input);
if (!dir) process.exit(0);

const readJson = (f) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };
const cfg = readJson(join(dir, "project.config.json")) ?? {};

const missing = [];
if (isUnfilledTemplate(dir)) {
  missing.push("project.config.json still holds <<PLACEHOLDER>> values — run /lsg:project-setup.");
}
if (!existsSync(join(dir, "node_modules"))) missing.push("dependencies are not installed — run `npm install`.");
/* framework "none": a standalone theme, so no OutSystems UI submodule or base to build. */
if ((cfg.framework ?? "outsystems-ui") === "outsystems-ui") {
  const osui = join(dir, "vendor", "outsystems-ui");
  if (!existsSync(osui) || readdirSync(osui).length === 0) {
    missing.push("the OutSystems UI submodule is empty — run `git submodule update --init vendor/outsystems-ui`.");
  }
  if (!existsSync(join(dir, "review", "vendor", "outsystems-ui", "outsystems-ui.css"))) {
    missing.push("the OutSystems UI base is not built — run `npm run build:osui` (build:theme and the fidelity gate need it).");
  }
}
if (!existsSync(join(dir, "vendor", "outsystems-frontend-skills", "ui-frameworks", "outsystems-ui", "blocks-index.md"))) {
  missing.push("the platform-knowledge pack is missing at vendor/outsystems-frontend-skills — the skills cannot look up blocks.");
}

/* OutSystems' official MCP skill for the project's platform is required, not optional. */
const configDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
if ((cfg.environment ?? "ODC") === "O11") {
  const skill = ["skills/servicestudio-mcp-oml/SKILL.md"].some(
    (rel) => existsSync(join(configDir, rel)) || existsSync(join(dir, ".claude", rel))
  );
  if (!skill) {
    missing.push(
      "REQUIRED on O11: OutSystems' servicestudio-mcp-oml skill is not installed — clone " +
        "https://github.com/OutSystems/outsystems11-mcp and run `bash scripts/install.sh`, then start a new session."
    );
  }
  const servers = readJson(process.env.CLAUDE_CONFIG_DIR ? join(configDir, ".claude.json") : join(homedir(), ".claude.json"))?.mcpServers ?? {};
  if (!servers.servicestudio) {
    missing.push(
      "REQUIRED on O11: the servicestudio MCP server is not registered — start it in Service Studio " +
        "(Edit > MCP Configuration > Start MCP Server) and run the `claude mcp add … servicestudio … --scope user` command it shows."
    );
  }
} else {
  const project = readJson(join(dir, ".claude", "settings.json")) ?? {};
  const source = project.extraKnownMarketplaces?.outsystems?.source?.repo;
  if (project.enabledPlugins?.["outsystems@outsystems"] !== true || source !== "OutSystems/outsystems-mcp") {
    missing.push(
      "REQUIRED on ODC: OutSystems' outsystems plugin (OutSystems/outsystems-mcp) is not enabled in .claude/settings.json."
    );
  }
  const tenant = cfg.odcTenant;
  if (typeof tenant === "string" && tenant && !tenant.includes("<<")) {
    const set = readJson(join(configDir, "settings.json"))?.pluginConfigs?.["outsystems@outsystems"]?.options?.tenant_hostname;
    if (!set) {
      missing.push(
        `REQUIRED on ODC: the outsystems plugin has no tenant on this machine — run ` +
          `\`claude plugin install outsystems@outsystems --config tenant_hostname=${tenant}\` and restart.`
      );
    } else if (set !== tenant) {
      missing.push(
        `the outsystems plugin points at ${set} but project.config.json says ${tenant} — ` +
          "this would build into the wrong tenant; confirm with the user before changing it."
      );
    }
  }
}

if (!missing.length) process.exit(0);

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext:
        `This project's setup is incomplete:\n- ${missing.join("\n- ")}\n` +
        "/lsg:deliver will not drive OutSystems through the MCP until every REQUIRED item is fixed.",
    },
  })
);
