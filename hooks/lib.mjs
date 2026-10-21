import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export async function readInput() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

/* A project this plugin serves: a package.json with build:theme and a project.config.json. */
export function projectRoot(input) {
  const dir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const pkg = join(dir, "package.json");
  if (!existsSync(pkg) || !existsSync(join(dir, "project.config.json"))) return null;
  try {
    return JSON.parse(readFileSync(pkg, "utf8")).scripts?.["build:theme"] ? dir : null;
  } catch {
    return null;
  }
}

/* The template itself ships <<PLACEHOLDER>> values by design. */
export function isUnfilledTemplate(dir) {
  return readFileSync(join(dir, "project.config.json"), "utf8").includes("<<");
}
