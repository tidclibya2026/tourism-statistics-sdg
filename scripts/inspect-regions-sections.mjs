import fs from "node:fs";
import XLSX from "xlsx";

const input = "/tmp/tourism_regions_extract/التقريرالإحصائيللأقاليمالأربعةلسنة2014-2015-2016م.xlsx";
const output = "/tmp/tourism_regions_extract/regions_section_samples.json";
const workbook = XLSX.readFile(input, { cellDates: false });
const normalize = (value) => String(value ?? "").trim().replace(/[\u200f\u200e]/g, " ").replace(/\s+/g, " ");
const target = /(مرافق الإيواء العاملة.*2014|المناطق التي تم تخريطها|المواقع المخرطة|المنتزهات الوطنية)/;

const sections = [];
for (const sheetName of workbook.SheetNames) {
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" });
  rows.forEach((row, index) => {
    const text = row.map(normalize).filter(Boolean).join(" | ");
    if (!target.test(text)) return;
    sections.push({
      sheetName,
      titleRow: index + 1,
      rows: rows.slice(index, Math.min(index + 18, rows.length)).map((sample, offset) => ({ row: index + offset + 1, cells: sample.map(normalize) })),
    });
  });
}

fs.writeFileSync(output, `${JSON.stringify(sections, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ sections: sections.map(({ sheetName, titleRow }) => ({ sheetName, titleRow })), output }, null, 2));
