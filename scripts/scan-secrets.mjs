import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { scanText } from "./lib/secret-scan.mjs";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const findings = [];

for (const path of files) {
  if (statSync(path).size > MAX_FILE_SIZE) continue;
  const content = readFileSync(path);
  if (content.includes(0)) continue;
  findings.push(...scanText(path, content.toString("utf8")));
}

if (findings.length > 0) {
  console.error(`Secret scan failed with ${findings.length} finding(s):`);
  for (const finding of findings) {
    console.error(`${finding.path}:${finding.line} [${finding.rule}]`);
  }
  console.error("Only file locations and rule names are shown; secret values are never printed.");
  process.exit(1);
}

console.log(`Secret scan passed for ${files.length} tracked files.`);
