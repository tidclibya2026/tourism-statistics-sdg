import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

const migrationDir = path.join(process.cwd(), "drizzle");
const journal = JSON.parse(await readFile(path.join(migrationDir, "meta", "_journal.json"), "utf8"));
const sqlFiles = (await readdir(migrationDir)).filter(file => file.endsWith(".sql")).sort();
const entries = [...(journal.entries ?? [])].sort((a, b) => a.idx - b.idx);
const errors = [];
const warnings = [];
const tags = new Set(entries.map(entry => entry.tag));

for (const [position, entry] of entries.entries()) {
  if (entry.idx !== position) errors.push(`تسلسل الترحيلات غير متصل عند الفهرس ${position}`);
  if (!sqlFiles.includes(`${entry.tag}.sql`)) errors.push(`ملف SQL مفقود للترحيل: ${entry.tag}`);
}
for (const file of sqlFiles) {
  if (!tags.has(file.replace(/\.sql$/i, ""))) warnings.push(`ملف SQL غير مسجل في journal: ${file}`);
  const sql = await readFile(path.join(migrationDir, file), "utf8");
  if (/\b(?:DROP\s+(?:TABLE|DATABASE|COLUMN)|TRUNCATE\s+TABLE)\b/i.test(sql)) {
    warnings.push(`الترحيل يحتاج مراجعة تدميرية صريحة: ${file}`);
  }
}

const migrations = {
  ok: errors.length === 0,
  migrationCount: entries.length,
  latestMigration: entries.at(-1)?.tag ?? null,
  errors,
  warnings,
};
const result = { migrations };

if (process.argv.includes("--connect")) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL مطلوب عند استخدام --connect");
  const started = Date.now();
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    await connection.query("SELECT 1 AS ok");
    const [databaseRows] = await connection.query("SELECT DATABASE() AS databaseName");
    const [tlsRows] = await connection.query("SHOW STATUS LIKE 'Ssl_cipher'");
    const databaseName = databaseRows[0]?.databaseName ?? null;
    const tlsCipher = tlsRows[0]?.Value ?? "";
    result.connection = { ok: true, databaseSelected: Boolean(databaseName), tlsActive: Boolean(tlsCipher), latencyMs: Date.now() - started };
  } finally {
    await connection.end();
  }
}

console.log(JSON.stringify(result, null, 2));
if (!migrations.ok || migrations.warnings.length > 0) process.exitCode = 1;
