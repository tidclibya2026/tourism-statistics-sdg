import fs from "node:fs";
import XLSX from "xlsx";
import { validateImportedCityStatistics } from "../shared/cityStatisticsImport.ts";

const input = "/home/ubuntu/generated_reports/دفعة_مدن_رسمية_2019_2021_للاستيراد_كمسودات.xlsx";
const overview = JSON.parse(fs.readFileSync("/tmp/spatial-overview-response.json", "utf8")).result.data.json;
const workbook = XLSX.readFile(input, { cellDates: false });
const expectedSheets = ["إرشادات الدفعة", "طلب البيانات", "تسميات تحتاج قراراً"];
for (const sheet of expectedSheets) if (!workbook.Sheets[sheet]) throw new Error(`Missing worksheet: ${sheet}`);
const rows = XLSX.utils.sheet_to_json(workbook.Sheets["طلب البيانات"], { defval: "" });
const candidates = JSON.parse(fs.readFileSync("/tmp/new_tourism_files_index/city_2019_annual_candidates.json", "utf8")).candidateRows
  .concat(JSON.parse(fs.readFileSync("/tmp/new_tourism_files_index/city_2020_annual_candidates.json", "utf8")).candidateRows)
  .concat(JSON.parse(fs.readFileSync("/tmp/new_tourism_files_index/city_2021_annual_candidates.json", "utf8")).candidateRows);
const indicatorCodes = [...new Set(candidates.map((row) => row.indicatorCode))];
const validation = validateImportedCityStatistics(
  rows,
  overview.cities.map((city) => ({ id: city.id, code: city.code, type: city.type, status: city.status })),
  indicatorCodes.map((code, index) => ({ id: index + 1, code, unit: "عدد" })),
);
if (rows.length !== 524) throw new Error(`Expected 524 rows, received ${rows.length}.`);
if (validation.issues.length || validation.accepted.length !== rows.length || validation.ignoredRows !== 0) throw new Error(`Invalid prepared import: ${JSON.stringify({ accepted: validation.accepted.length, ignored: validation.ignoredRows, issues: validation.issues.slice(0, 5) })}`);
console.log(JSON.stringify({ input, rows: rows.length, accepted: validation.accepted.length, years: [...new Set(validation.accepted.map((row) => row.year))], indicators: indicatorCodes }, null, 2));
