import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const input = process.argv[2];
if (!input || !fs.existsSync(input)) throw new Error("Provide an existing XLS/XLSX report path as the first argument.");
const output = process.argv[3] ?? `/tmp/${path.basename(input).replace(/\.[^.]+$/, "")}_city_index.json`;
const workbook = XLSX.readFile(input, { cellDates: false });
const normalize = (value) => String(value ?? "").trim().replace(/[\u200f\u200e]/g, " ").replace(/\s+/g, " ");
const relevant = /(مدينة|مدن|مواقع|مناطق.*سياح|استثمار|إيواء|فندق|غرف|أسرّة|اسرة|مرشد|شركات|مكاتب|201[0-9]|202[0-9])/;

const index = workbook.SheetNames.map((sheetName) => {
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" });
  return {
    sheetName,
    rowCount: rows.length,
    matches: rows
      .map((row, rowIndex) => ({ row: rowIndex + 1, text: row.map(normalize).filter(Boolean).join(" | ") }))
      .filter((item) => item.text && relevant.test(item.text))
      .slice(0, 220),
  };
});

fs.writeFileSync(output, `${JSON.stringify(index, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ input, sheets: index.map(({ sheetName, rowCount, matches }) => ({ sheetName, rowCount, matches: matches.length })), output }, null, 2));
