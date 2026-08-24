import fs from "node:fs";
import XLSX from "xlsx";

const [input, output, ...specs] = process.argv.slice(2);
if (!input || !output || specs.length === 0 || !fs.existsSync(input)) throw new Error("Usage: node dump-workbook-ranges.mjs <input> <output> <sheet:start:end> [...]");
const workbook = XLSX.readFile(input, { cellDates: false });
const normalize = (value) => String(value ?? "").trim().replace(/[\u200f\u200e]/g, " ").replace(/\s+/g, " ");
const result = specs.map((spec) => {
  const [sheetName, startRaw, endRaw] = spec.split(":");
  const start = Number(startRaw);
  const end = Number(endRaw);
  const sheet = workbook.Sheets[sheetName];
  if (!sheet || !Number.isInteger(start) || !Number.isInteger(end)) throw new Error(`Invalid range: ${spec}`);
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  return {
    sheetName,
    start,
    end,
    rows: rows.slice(start - 1, end).map((row, index) => ({ row: start + index, cells: row.map(normalize) })),
  };
});
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output, ranges: result.map(({ sheetName, start, end }) => ({ sheetName, start, end })) }, null, 2));
