import XLSX from "xlsx";
import fs from "node:fs";

const input = "/tmp/tourism_regions_extract/التقريرالإحصائيللأقاليمالأربعةلسنة2014-2015-2016م.xlsx";
const output = "/tmp/tourism_regions_extract/city_accommodation_2013.json";
const sqlOutput = "/tmp/tourism_regions_extract/city_accommodation_2013_import.sql";
const workbook = XLSX.readFile(input, { cellDates: false });
const records = [];

const normalize = (value) => String(value ?? "").trim().replace(/[\u200f\u200e]/g, "");
const numeric = (value) => {
  const parsed = Number(normalize(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

for (const sheetName of workbook.SheetNames.slice(0, 4)) {
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" });
  let capture = false;
  for (const row of rows) {
    const cells = row.map(normalize);
    const label = cells.join(" ");
    if (label.includes("الإحصائية الخاصة بمرافق الإيواء العاملة بليبيا حسب المدن") && label.includes("2013")) {
      capture = true;
      continue;
    }
    if (!capture) continue;
    const city = cells[0];
    if (city.includes("Statistics for Accommodation") || city.includes("الإحصائية الخاصة")) continue;
    if (city === "الإجمالي") {
      capture = false;
      continue;
    }
    const values = cells.slice(1, 5).map(numeric);
    if (!city || values.some((value) => value === null)) continue;
    records.push({
      city,
      year: 2013,
      hotels: values[0],
      rooms: values[1],
      beds: values[2],
      accommodationEmployment: values[3],
      source: "التقرير الإحصائي للأقاليم الأربعة 2014–2016، جدول مرافق الإيواء العاملة حسب المدن لسنة 2013",
      worksheet: sheetName,
    });
  }
}

fs.writeFileSync(output, `${JSON.stringify(records, null, 2)}\n`, "utf8");

const codes = {
  "طرابلس": "CITY-TRIPOLI", "بنغازي": "CITY-BENGHAZI", "سبها": "CITY-SABHA", "البيضاء": "CITY-AL-BAYDA", "طبرق": "CITY-TOBRUK", "المرج": "CITY-AL-MARJ", "درنة": "CITY-DERNA", "الزاوية": "CITY-ZAWIYA", "صبرااتة": "CITY-SABRATHA", "الخمس": "CITY-AL-KHUMS", "يفرن": "CITY-YAFRAN", "مصراتة": "CITY-MISRATA", "نالوت": "CITY-NALUT", "العجيلات": "CITY-AL-AJAYLAT", "بني وليد": "CITY-BANI-WALID", "غدامس": "CITY-GHADAMES", "زليتن": "CITY-ZLITEN", "غريان": "CITY-GHARYAN", "زوارة": "CITY-ZUWARA", "جنزور": "CITY-JANZUR", "السواني": "CITY-AL-SWANI", "سرت": "CITY-SIRTE", "الجفرة": "CITY-AL-JUFRA", "إجدابيا": "CITY-AJDABIYA", "الكفرة": "CITY-AL-KUFRA", "جالو": "CITY-JALU", "أوباري": "CITY-AWBARI", "غات": "CITY-GHAT", "مرزق": "CITY-MURZUQ", "الشاطئ": "CITY-AL-SHATI", "وادي الحياة": "CITY-WADI-AL-HAYAT",
};
const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;
const source = "التقرير الإحصائي للأقاليم الأربعة 2014–2016، جدول مرافق الإيواء العاملة حسب المدن لسنة 2013، صادر عن مركز المعلومات والتوثيق السياحي";
const cityValues = records.map((record) => `(${quote(codes[record.city])}, ${quote(record.city)}, 'city', ${quote("مرجع مدني مستخرج من تقرير الأقاليم الأربعة 2014–2016")}, 'not_provided', 'active')`).join(",\n");
const indicatorMappings = [
  ["SPATIAL-HOTELS-OPERATING", "hotels"],
  ["HIST-ROOMS", "rooms"],
  ["SPATIAL-ACCOMMODATION-BEDS", "beds"],
  ["HIST-ACCOMMODATION-EMPLOYMENT", "accommodationEmployment"],
];
const observationSelects = indicatorMappings.flatMap(([indicatorCode, field]) => records.map((record) => `SELECT ${quote(codes[record.city])} AS code, ${quote(indicatorCode)} AS indicatorCode, 2013 AS year, ${record[field]} AS value, ${quote(source)} AS source, ${quote(`ورقة «${record.worksheet}»؛ صف «${record.city}»`)} AS notes`)).join("\nUNION ALL\n");
const sql = `-- قياسات مدنية مستخرجة من جدول رسمي واضح لسنة 2013. تدخل مسودات وتحتاج مراجعة مستقلة واعتماداً لاحقاً.
INSERT INTO spatialAreas (code, name, type, geographicSource, boundaryStatus, status)
VALUES
${cityValues}
ON DUPLICATE KEY UPDATE name = VALUES(name), status = 'active';

INSERT INTO spatialObservations (spatialAreaId, indicatorId, year, period, quarter, value, source, notes, verificationStatus, enteredBy)
SELECT area.id, indicator.id, data.year, 'annual', 'annual', data.value, data.source, data.notes, 'draft', 1
FROM (
${observationSelects}
) AS data
INNER JOIN spatialAreas AS area ON area.code = data.code
INNER JOIN indicators AS indicator ON indicator.code = data.indicatorCode
ON DUPLICATE KEY UPDATE value = VALUES(value), source = VALUES(source), notes = VALUES(notes), verificationStatus = 'draft', enteredBy = 1, verifiedBy = NULL, verifiedAt = NULL;
`;
fs.writeFileSync(sqlOutput, sql, "utf8");
console.log(JSON.stringify({ records: records.length, observationDrafts: records.length * indicatorMappings.length, cities: records.map((record) => record.city), sqlOutput }, null, 2));
