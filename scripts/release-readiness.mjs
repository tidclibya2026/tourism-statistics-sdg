import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const allowDirty = process.argv.includes("--allow-dirty");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const git = (...args) => spawnSync("git", args, { encoding: "utf8" }).stdout.trim();
const clean = git("status", "--porcelain") === "";

if (!clean && !allowDirty) {
  console.error("Release gate requires a clean working tree. Use release:gate:dev only while developing.");
  process.exit(1);
}

const commands = [
  ["secret-scan", ["security:secrets"]],
  ["migration-readiness", ["db:readiness"]],
  ["typescript", ["check"]],
  ["tests", ["test", "--run"]],
  ["dependency-audit", ["audit", "--prod", "--audit-level=high"]],
  ["production-build", ["build"]],
];
const results = [];

for (const [name, args] of commands) {
  const started = Date.now();
  console.log(`\n=== ${name} ===`);
  const result = spawnSync(pnpm, args, { stdio: "inherit", shell: false });
  results.push({ name, result: result.status === 0 ? "passed" : "failed", durationMs: Date.now() - started });
  if (result.status !== 0) break;
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  commit: git("rev-parse", "HEAD"),
  branch: git("branch", "--show-current") || "detached",
  cleanWorkingTree: clean,
  result: results.length === commands.length && results.every(item => item.result === "passed") ? "passed" : "failed",
  gates: results,
};
writeFileSync("release-readiness-report.json", `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
console.log(`\nRelease readiness: ${report.result}. Report: release-readiness-report.json`);
process.exit(report.result === "passed" ? 0 : 1);
