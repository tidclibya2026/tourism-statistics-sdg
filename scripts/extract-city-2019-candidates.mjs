import fs from "node:fs";
import XLSX from "xlsx";

const input = "/home/ubuntu/upload/التقريرالإحصائيلسنة2019م.xls";
const overviewInput = "/tmp/spatial-overview-response.json";
const output = "/tmp/new_tourism_files_index/city_2019_candidates.json";
const workbook = XLSX.readFile(input, { cellDates: false });
const cities = JSON.parse(fs.readFileSync(overviewInput, "utf8")).result.data.json.cities;
const rows = XLSX.utils.sheet_to_json(workbook.Sheets["ورقة6"], { header: 1, defval: "" });

function normalize(value) {
  return String(value ?? "")
    .trim()
    .replace(/[\u064B-\u065F\u0670\u200f\u200eـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ");
}

const aliases = new Map([
  ["صبرااتة", "صبراتة"],
]);
const cityByName = new Map(cities.map((city) => [normalize(city.name), city]));
const mapCity = (name) => cityByName.get(normalize(aliases.get(name) ?? name));
const candidateRows = [];
const unmatchedCities = new Set();
const source = "التقرير الإحصائي لسنة 2019م — مركز المعلومات والتوثيق السياحي / إدارة شؤون المهن والرقابة السياحية";
const baseNote = "ملف التقريرالإحصائيلسنة2019م.xls، ورقة6؛ قيمة مدنية سنوية صريحة. يُنشأ السجل كمسودة فقط ويحتاج مراجعة مستقلة واعتماد مسؤول.";

function pushTable(startRow, endRow, measures, tableTitleRow) {
  for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
    const row = rows[rowNumber - 1] ?? [];
    const rawCity = String(row[0] ?? "").trim();
    if (!rawCity || rawCity === "الإجمالي") continue;
    const city = mapCity(rawCity);
    if (!city) {
      unmatchedCities.add(rawCity);
      continue;
    }
    for (const measure of measures) {
      const rawValue = row[measure.column];
      const value = Number(rawValue);
      if (!Number.isFinite(value)) continue;
      candidateRows.push({
        cityCode: city.code,
        cityName: city.name,
        sourceCityName: rawCity,
        indicatorCode: measure.indicatorCode,
        year: 2019,
        period: "annual",
        quarter: "annual",
        value,
        unit: "عدد",
        source,
        sourceSheet: "ورقة6",
        sourceTitle: String(rows[tableTitleRow - 1]?.[0] ?? "").trim(),
        sourceRow: rowNumber,
        notes: `${baseNote} جدول/عنوان: ${String(rows[tableTitleRow - 1]?.[0] ?? "").trim()}؛ صف ${rowNumber}.`,
      });
    }
  }
}

pushTable(85, 120, [
  { column: 2, indicatorCode: "HIST-TOURISM-COMPANIES" },
  { column: 4, indicatorCode: "HIST-TOURISM-OFFICES" },
], 81);
pushTable(170, 200, [
  { column: 2, indicatorCode: "SPATIAL-HOTELS-OPERATING" },
  { column: 4, indicatorCode: "HIST-ROOMS" },
  { column: 6, indicatorCode: "SPATIAL-ACCOMMODATION-BEDS" },
  { column: 8, indicatorCode: "HIST-ACCOMMODATION-EMPLOYMENT" },
], 166);

fs.writeFileSync(output, `${JSON.stringify({ input, extractedAt: new Date().toISOString(), candidateRows, unmatchedCities: [...unmatchedCities], excluded: ["لم يدرج عمود العمالة في الشركات والمكاتب لعدم وجود مؤشر مدني منشور مطابق في القاموس.", "لم تدرج جداول المواقع أو المنتزهات لأن تعريفها لا يطابق مؤشر المواقع السياحية الموثقة.", "لم تدرج بيانات الاستثمار لعدم وجود جدول مدني سنوي صريح للقيمة المالية." ] }, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output, candidates: candidateRows.length, cities: new Set(candidateRows.map((row) => row.cityCode)).size, unmatchedCities: [...unmatchedCities] }, null, 2));
