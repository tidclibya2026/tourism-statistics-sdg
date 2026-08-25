import fs from "node:fs";
import * as db from "../server/db";
import { validateImportedCityStatistics } from "../shared/cityStatisticsImport";

const apply = process.argv.includes("--apply");
const enteredBy = 1;
const inputFiles = [
  "/tmp/new_tourism_files_index/city_2019_annual_candidates.json",
  "/tmp/new_tourism_files_index/city_2020_annual_candidates.json",
  "/tmp/new_tourism_files_index/city_2021_annual_candidates.json",
];
const output = "/tmp/new_tourism_files_index/city_2019_2021_import_result.json";
const candidates = inputFiles.flatMap((file) => JSON.parse(fs.readFileSync(file, "utf8")).candidateRows);
const cityCodes = [...new Set(candidates.map((row) => row.cityCode))];
const indicatorCodes = [...new Set(candidates.map((row) => row.indicatorCode))];
const [cities, indicators] = await Promise.all([db.getSpatialAreasByCodes(cityCodes), db.getIndicatorsByCodes(indicatorCodes)]);
const rows = candidates.map((row) => ({
  "رمز المدينة": row.cityCode,
  "رمز المؤشر في المنصة": row.indicatorCode,
  "السنة المقدمة": row.year,
  "القيمة المقدمة": row.value,
  "الوحدة المطلوبة": row.unit,
  "الفترة": "سنوي كامل",
  "المصدر الرسمي / اسم التقرير": row.source,
  "رقم الجدول أو الصفحة": `${row.sourceSheet}، صف ${row.sourceRow}؛ ${row.sourceTitle}`,
  "رقم المرجع أو الرابط": `ملف رسمي مرفق: ${row.source.split(" — ")[0]}`,
  "تاريخ نشر المصدر": "",
  "الجهة المزودة": "مركز المعلومات والتوثيق السياحي / إدارة شؤون المهن والرقابة السياحية",
  "ملاحظات ومنهجية": row.notes,
}));
const validation = validateImportedCityStatistics(rows, cities, indicators);
const cityByCode = new Map(cities.map((city) => [city.code, city]));
const indicatorByCode = new Map(indicators.map((indicator) => [indicator.code, indicator]));
const byKey = new Map(candidates.map((candidate) => [`${candidate.cityCode}|${candidate.indicatorCode}|${candidate.year}`, candidate]));
const issues = [...validation.issues];
const writable = [];

for (const row of validation.accepted) {
  const city = cityByCode.get(row.cityCode);
  const indicator = indicatorByCode.get(row.indicatorCode);
  if (!city || !indicator) continue;
  const existing = await db.getSpatialObservationForPeriod({ spatialAreaId: city.id, indicatorId: indicator.id, year: row.year, period: "annual", quarter: "annual" });
  if (existing && (existing.verificationStatus !== "draft" || existing.enteredBy !== enteredBy)) {
    issues.push({ rowNumber: 0, field: "القياس القائم", message: `لا يمكن استبدال القياس القائم للمدينة ${city.name} والمؤشر ${indicator.code} والسنة ${row.year} لأنه ${existing.verificationStatus}.`, severity: "error" });
    continue;
  }
  writable.push({ row, city, indicator, sourceRow: byKey.get(`${row.cityCode}|${row.indicatorCode}|${row.year}`) });
}

const result = { mode: apply ? "apply" : "dry-run", candidates: candidates.length, accepted: writable.length, rejected: issues.length, issues, years: [...new Set(writable.map((item) => item.row.year))] };
if (apply) {
  const jobId = await db.createImportJob({
    fileName: "دفعة_مدن_رسمية_2019_2021_للاستيراد_كمسودات.xlsx",
    fileType: "Excel",
    status: issues.length ? "completed_with_errors" : "completed",
    totalRows: candidates.length,
    acceptedRows: writable.length,
    rejectedRows: candidates.length - writable.length,
    submittedBy: enteredBy,
  });
  await db.createImportIssues(jobId, issues);
  for (const item of writable) {
    const candidate = item.sourceRow;
    await db.upsertSpatialObservation({
      spatialAreaId: item.city.id,
      indicatorId: item.indicator.id,
      year: item.row.year,
      period: "annual",
      quarter: "annual",
      value: String(item.row.value),
      source: item.row.sourceTitle.slice(0, 500),
      notes: candidate?.notes ?? "استيراد من جدول مدني رسمي سنوي؛ مسودة بانتظار المراجعة المستقلة.",
      enteredBy,
      verificationStatus: "draft",
    });
  }
  Object.assign(result, { jobId });
}
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...result, issuePreview: issues.slice(0, 5) }, null, 2));
process.exit(0);
