import fs from "node:fs/promises";
import mysql from "mysql2/promise";

const sourceFile = "/tmp/tourism_regions_extract/city_accommodation_2013.json";
const outputFile = "/home/ubuntu/tourism-statistics-sdg/city_source_reconciliation_current.md";
const sourceRows = JSON.parse(await fs.readFile(sourceFile, "utf8"));

const cityAliases = new Map([["صبرااتة", "صبراتة"]]);
const indicatorByField = {
  hotels: "عدد مرافق الإيواء العاملة حسب المدينة",
  rooms: "عدد الغرف الفندقية",
  beds: "عدد الأسرة في مرافق الإيواء حسب المدينة",
  accommodationEmployment: "العمالة في مرافق الإيواء",
};

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL غير متاح لأداة المطابقة.");
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const [databaseRows] = await connection.query(`
  SELECT
    o.id,
    a.name AS city,
    i.name AS indicator,
    o.year,
    o.value,
    o.verificationStatus AS status,
    o.enteredBy AS enteredBy,
    o.source
  FROM spatialObservations o
  JOIN spatialAreas a ON a.id = o.spatialAreaId
  JOIN indicators i ON i.id = o.indicatorId
  WHERE o.year = 2013
    AND o.source LIKE '%التقرير الإحصائي للأقاليم الأربعة%'
`);
await connection.end();

const currentByKey = new Map(databaseRows.map((row) => [`${row.city}|${row.indicator}|${row.year}`, row]));
const expectedRows = sourceRows.flatMap((row) => Object.entries(indicatorByField).map(([field, indicator]) => ({
  city: cityAliases.get(row.city) ?? row.city,
  indicator,
  year: row.year,
  value: Number(row[field]),
  worksheet: row.worksheet,
})));

const missing = [];
const mismatched = [];
const withdrawn = [];
for (const expected of expectedRows) {
  const key = `${expected.city}|${expected.indicator}|${expected.year}`;
  const current = currentByKey.get(key);
  if (!current) {
    missing.push(expected);
    continue;
  }
  if (Number(current.value) !== expected.value) {
    mismatched.push({ ...expected, actualValue: Number(current.value), id: current.id, status: current.status });
  }
  if (current.status === "rejected") {
    withdrawn.push({ ...expected, id: current.id });
  }
}

const countByStatus = databaseRows.reduce((counts, row) => {
  counts[row.status] = (counts[row.status] ?? 0) + 1;
  return counts;
}, {});
const lines = [
  "# مطابقة الدفعة المدنية الرسمية الحالية",
  "",
  "هذه نتيجة قراءة فقط تقارن جدول مرافق الإيواء العاملة حسب المدن لسنة 2013 مع سجلات قاعدة البيانات الحالية.",
  "",
  "| البند | النتيجة |",
  "|---|---:|",
  `| القياسات المتوقعة من ملف المصدر | ${expectedRows.length} |`,
  `| القياسات المطابقة الموجودة حالياً | ${expectedRows.length - missing.length} |`,
  `| القياسات المفقودة | ${missing.length} |`,
  `| القياسات ذات قيمة مخالفة | ${mismatched.length} |`,
  `| قياسات مسحوبة/مرفوضة | ${withdrawn.length} |`,
  `| معتمدة | ${countByStatus.approved ?? 0} |`,
  `| مسودات | ${countByStatus.draft ?? 0} |`,
  `| مرفوضة | ${countByStatus.rejected ?? 0} |`,
  "",
  "## القياسات المفقودة",
  "",
  missing.length ? "| المدينة | المؤشر | السنة | القيمة | ورقة المصدر |\n|---|---|---:|---:|---|\n" + missing.map((item) => `| ${item.city} | ${item.indicator} | ${item.year} | ${item.value} | ${item.worksheet} |`).join("\n") : "لا توجد قياسات مفقودة.",
  "",
  "## القياسات المخالفة أو المسحوبة",
  "",
  withdrawn.length ? "| المعرّف | المدينة | المؤشر | القيمة المصدرية |\n|---:|---|---|---:|\n" + withdrawn.map((item) => `| ${item.id} | ${item.city} | ${item.indicator} | ${item.value} |`).join("\n") : "لا توجد قياسات رسمية مسحوبة.",
  "",
  mismatched.length ? "## اختلافات القيمة\n\n| المعرّف | المدينة | المؤشر | قيمة المصدر | القيمة الحالية | الحالة |\n|---:|---|---|---:|---:|---|\n" + mismatched.map((item) => `| ${item.id} | ${item.city} | ${item.indicator} | ${item.value} | ${item.actualValue} | ${item.status} |`).join("\n") : "لا توجد اختلافات قيم بين السجلات الموجودة وملف المصدر.",
  "",
  "> السجلات الغائبة أو المسحوبة لا تُستعاد كمعتمدة؛ تُعاد أولاً كمسودات موثقة ثم تمر عبر المراجعة المستقلة واعتماد المسؤول.",
  "",
].join("\n");

await fs.writeFile(outputFile, lines, "utf8");
console.log(JSON.stringify({ expected: expectedRows.length, present: expectedRows.length - missing.length, missing: missing.length, mismatched: mismatched.length, withdrawn: withdrawn.length, outputFile }, null, 2));
