import fs from "node:fs";
import XLSX from "xlsx";

const input = "/tmp/tourism_regions_extract/التقريرالإحصائيللأقاليمالأربعةلسنة2014-2015-2016م.xlsx";
const output = "/tmp/tourism_regions_extract/workbook_table_index.json";
const workbook = XLSX.readFile(input, { cellDates: false });
const normalize = (value) => String(value ?? "").trim().replace(/[\u200f\u200e]/g, " ").replace(/\s+/g, " ");
const relevant = /(مدينة|مدن|الإيواء|مرافق|فندق|غرف|أسرّة|اسرة|عامل|مواقع|استثمار|201[0-9])/;

const index = workbook.SheetNames.map((sheetName) => {
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" });
  return {
    sheetName,
    rowCount: rows.length,
    matches: rows
      .map((row, rowIndex) => ({ row: rowIndex + 1, text: row.map(normalize).filter(Boolean).join(" | ") }))
      .filter((item) => item.text && relevant.test(item.text))
      .slice(0, 160),
  };
});

fs.writeFileSync(output, `${JSON.stringify(index, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ sheets: index.map(({ sheetName, rowCount, matches }) => ({ sheetName, rowCount, matches: matches.length })), output }, null, 2));
