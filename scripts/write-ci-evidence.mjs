import { writeFileSync } from "node:fs";

const [job, ...gates] = process.argv.slice(2);
if (!job || gates.length === 0) {
  console.error("Usage: node scripts/write-ci-evidence.mjs <job> <gate...>");
  process.exit(2);
}

const evidence = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  repository: process.env.GITHUB_REPOSITORY ?? "local",
  commit: process.env.GITHUB_SHA ?? "local",
  ref: process.env.GITHUB_REF ?? "local",
  runId: process.env.GITHUB_RUN_ID ?? "local",
  job,
  result: "passed",
  gates: gates.map(name => ({ name, result: "passed" })),
};

const output = `release-evidence-${job}.json`;
writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
console.log(`Wrote ${output} without environment values or command output.`);
