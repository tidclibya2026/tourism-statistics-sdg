import XLSX from "xlsx";

const input = "/home/ubuntu/generated_reports/نموذج_طلب_بيانات_المدن_السياحية_لقسم_الإحصاء.xlsx";
const workbook = XLSX.readFile(input, { cellDates: false });
const expectedSheets = ["إرشادات الإحالة", "طلب البيانات", "ملخص الفجوات", "سجل المدن"];
for (const name of expectedSheets) {
  if (!workbook.SheetNames.includes(name)) throw new Error(`Missing required sheet: ${name}`);
}

const requestRows = XLSX.utils.sheet_to_json(workbook.Sheets["طلب البيانات"], { defval: "" });
const cities = XLSX.utils.sheet_to_json(workbook.Sheets["سجل المدن"], { defval: "" });
const gaps = XLSX.utils.sheet_to_json(workbook.Sheets["ملخص الفجوات"], { defval: "" });
if (requestRows.length !== 490) throw new Error(`Expected 490 request rows, received ${requestRows.length}`);
if (cities.length !== 49) throw new Error(`Expected 49 city rows, received ${cities.length}`);
if (gaps.length !== 10) throw new Error(`Expected 10 gap categories, received ${gaps.length}`);
const sites = gaps.find((row) => row["رمز المؤشر"] === "SPATIAL-TOURISM-SITES-COUNT");
const investment = gaps.find((row) => row["رمز المؤشر"] === "SPATIAL-TOURISM-INVESTMENT-LYD");
if (!sites || !investment) throw new Error("Missing sites or investment data request rows.");
console.log(JSON.stringify({ workbook: input, sheets: workbook.SheetNames, requestRows: requestRows.length, cities: cities.length, categories: gaps.length }, null, 2));
