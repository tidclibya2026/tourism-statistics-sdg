import fs from "node:fs";
import XLSX from "xlsx";

const [input, yearRaw, output] = process.argv.slice(2);
if (!input || !yearRaw || !output || !fs.existsSync(input)) throw new Error("Usage: node extract-annual-city-services-and-accommodation.mjs <input> <year> <output>");
const year = Number(yearRaw);
if (!Number.isInteger(year)) throw new Error("Year must be an integer.");

const overview = JSON.parse(fs.readFileSync("/tmp/spatial-overview-response.json", "utf8")).result.data.json;
const cities = overview.cities;
const workbook = XLSX.readFile(input, { cellDates: false });
const aliases = new Map([["صبرااتة", "صبراتة"]]);
const source = `${input.split("/").pop()} — مركز المعلومات والتوثيق السياحي / إدارة شؤون المهن والرقابة السياحية`;

function normalize(value) {
  return String(value ?? "").trim().replace(/[\u064B-\u065F\u0670\u200f\u200eـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/\s+/g, " ");
}

const cityByName = new Map(cities.map((city) => [normalize(city.name), city]));
const matchCity = (name) => cityByName.get(normalize(aliases.get(name) ?? name));
const rows = XLSX.utils.sheet_to_json(workbook.Sheets["ورقة6"], { header: 1, defval: "" });
const result = [];
const unmatchedCities = new Set();
const tables = [];

function findRow(predicate) {
  return rows.findIndex((row) => predicate(String(row[0] ?? "").trim())) + 1;
}

function extractTable({ titleMatcher, measures, kind }) {
  const titleRow = findRow((cell) => titleMatcher.test(cell));
  if (!titleRow) return;
  const headerRow = rows.slice(titleRow - 1, titleRow + 5).findIndex((row) => normalize(row[0]) === "المدينة") + titleRow;
  if (headerRow < titleRow) return;
  let extracted = 0;
  for (let rowNumber = headerRow + 1; rowNumber <= rows.length; rowNumber += 1) {
    const row = rows[rowNumber - 1] ?? [];
    const rawCity = String(row[0] ?? "").trim();
    if (rawCity === "الإجمالي") break;
    if (!rawCity) continue;
    const city = matchCity(rawCity);
    if (!city) {
      unmatchedCities.add(rawCity);
      continue;
    }
    for (const measure of measures) {
      const value = Number(row[measure.column]);
      if (!Number.isFinite(value)) continue;
      result.push({
        cityCode: city.code,
        cityName: city.name,
        sourceCityName: rawCity,
        indicatorCode: measure.indicatorCode,
        year,
        period: "annual",
        quarter: "annual",
        value,
        unit: "عدد",
        source,
        sourceSheet: "ورقة6",
        sourceTitle: String(rows[titleRow - 1]?.[0] ?? "").trim(),
        sourceRow: rowNumber,
        notes: `قيمة مدنية سنوية صريحة من ${source}، ورقة6، جدول/عنوان: ${String(rows[titleRow - 1]?.[0] ?? "").trim()}، صف ${rowNumber}. تُنشأ مسودة فقط وتحتاج مراجعة مستقلة واعتماد مسؤول.`,
      });
      extracted += 1;
    }
  }
  tables.push({ kind, titleRow, headerRow, extracted });
}

extractTable({
  kind: "tourism_service_providers",
  titleMatcher: new RegExp(`تقرير مقدمي الخدمات السياحية حسب المدن لسنة ${year}`),
  measures: [
    { column: 2, indicatorCode: "HIST-TOURISM-COMPANIES" },
    { column: 4, indicatorCode: "HIST-TOURISM-OFFICES" },
  ],
});
extractTable({
  kind: "operating_accommodation",
  titleMatcher: year === 2019 ? /الإحصائية الخاصة بمرافق الإيواء العاملة بليبيا حسب المدن لسنة 2019/ : new RegExp(`الإحصائية الخاصة بالفنادق والنزل العاملة بليبيا حسب المدن لسنة ${year}`),
  measures: [
    { column: 2, indicatorCode: "SPATIAL-HOTELS-OPERATING" },
    { column: 4, indicatorCode: "HIST-ROOMS" },
    { column: 6, indicatorCode: "SPATIAL-ACCOMMODATION-BEDS" },
    { column: 8, indicatorCode: "HIST-ACCOMMODATION-EMPLOYMENT" },
  ],
});

fs.writeFileSync(output, `${JSON.stringify({ input, year, candidateRows: result, unmatchedCities: [...unmatchedCities], tables, excluded: ["عمالة الشركات والمكاتب لم تدرج لعدم وجود مؤشر مدني منشور مطابق.", "المواقع والمنتزهات لم تدرج لعدم تطابقها تلقائياً مع تعريف المواقع السياحية الموثقة.", "الاستثمار لم يدرج لغياب جدول مدني سنوي صريح بالقيمة المالية."] }, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output, year, candidates: result.length, cities: new Set(result.map((row) => row.cityCode)).size, unmatchedCities: [...unmatchedCities], tables }, null, 2));
