import fs from "node:fs/promises";
import mysql from "mysql2/promise";

const sqlPath = "/home/ubuntu/historical_observatory_import.sql";
const sql = await fs.readFile(sqlPath, "utf8");
const statements = sql
  .split(/;\s*\n/)
  .map((statement) => statement.trim())
  .filter(Boolean);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL غير متاح؛ تعذر استيراد الأرشيف التاريخي.");
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  for (const statement of statements) {
    await connection.query(statement);
  }
  const [indicatorRows] = await connection.query("SELECT COUNT(*) AS count FROM indicators WHERE code LIKE 'HIST-%'");
  const [observationRows] = await connection.query("SELECT COUNT(*) AS count, MIN(year) AS firstYear, MAX(year) AS lastYear FROM indicatorObservations WHERE source LIKE '%التقريرالإحصائي%' OR source LIKE '%تجميعبيانات%'");
  console.log(JSON.stringify({ indicators: indicatorRows[0], observations: observationRows[0] }, null, 2));
} finally {
  await connection.end();
}
