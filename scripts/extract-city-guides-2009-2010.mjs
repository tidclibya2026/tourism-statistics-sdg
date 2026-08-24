import fs from "node:fs";
import XLSX from "xlsx";

const reports = [
  { year: 2009, input: "/home/ubuntu/upload/التقريرالإحصائيلسنة2009م.xls" },
  { year: 2010, input: "/home/ubuntu/upload/التقريرالإحصائيلسنة2010م.xls" },
];
const output = "/tmp/tourism_regions_extract/city_tourist_guides_2009_2010.json";
const normalize = (value) => String(value ?? "").trim().replace(/[\u200f\u200e]/g, " ").replace(/\s+/g, " ");
const directCities = [
  ["نالوت", "CITY-NALUT"],
  ["سبها", "CITY-SABHA"],
  ["طرابلس", "CITY-TRIPOLI"],
  ["مصراتة", "CITY-MISRATA"],
  ["المرج", "CITY-AL-MARJ"],
];

const included = [];
const excluded = [];
for (const report of reports) {
  const workbook = XLSX.readFile(report.input, { cellDates: false });
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets["ورقة1"], { header: 1, defval: "" });
  const titleIndex = rows.findIndex((row) => normalize(row[0]).includes(`إحصائية المرشدين السياحيين إلى نهاية سنة ${report.year}`));
  if (titleIndex < 0) throw new Error(`Guide table for ${report.year} was not found.`);
  for (let index = titleIndex + 3; index < Math.min(titleIndex + 25, rows.length); index += 1) {
    const label = normalize(rows[index][0]);
    const value = Number(normalize(rows[index][3]).replace(/,/g, ""));
    if (!label || !Number.isFinite(value) || label.includes("الإجمالي")) continue;
    const match = directCities.find(([name]) => label === `المرشدين السياحيين ${name}`);
    if (!match) {
      excluded.push({ year: report.year, row: index + 1, label, value, reason: "تسمية إدارية أو مركبة أو غير مدنية مباشرة" });
      continue;
    }
    const [cityName, cityCode] = match;
    included.push({
      cityName,
      cityCode,
      year: report.year,
      value,
      indicatorCode: "HIST-TOURISM-GUIDES",
      source: `التقرير الإحصائي لسنة ${report.year}، جدول إحصائية المرشدين السياحيين إلى نهاية السنة، صادر عن مركز المعلومات والتوثيق السياحي`,
      notes: `ورقة «ورقة1»؛ صف ${index + 1}؛ تسمية المصدر: «${label}»`,
    });
  }
}

fs.writeFileSync(output, `${JSON.stringify({ included, excluded }, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ included: included.length, cities: [...new Set(included.map((item) => item.cityName))], excluded: excluded.length, output }, null, 2));
