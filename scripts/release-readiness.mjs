import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const allowDirty = process.argv.includes("--allow-dirty");
const git = (...args) => spawnSync("git", args, { encoding: "utf8" }).stdout.trim();
const clean = git("status", "--porcelain") === "";

function runPnpm(args) {
  // pnpm exposes the exact package-manager script through npm_execpath. Invoking
  // it with Node avoids Windows spawn failures for .cmd shims (EINVAL/ENOENT).
  if (process.env.npm_execpath) {
    return spawnSync(process.execPath, [process.env.npm_execpath, ...args], {
      stdio: "inherit",
      shell: false,
    });
  }

  return spawnSync(process.platform === "win32" ? "pnpm.cmd" : "pnpm", args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

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
  const result = runPnpm(args);
  if (result.error) {
    console.error(`Unable to start ${name}: ${result.error.code ?? result.error.message}`);
  }
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
