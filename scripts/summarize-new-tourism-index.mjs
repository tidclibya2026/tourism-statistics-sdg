import fs from "node:fs";
import path from "node:path";

const directory = "/tmp/new_tourism_files_index";
const output = path.join(directory, "catalog.md");
const files = fs.readdirSync(directory).filter((file) => file.endsWith(".json")).sort((a, b) => a.localeCompare(b, "ar"));
const rows = files.map((file) => {
  const index = JSON.parse(fs.readFileSync(path.join(directory, file), "utf8"));
  const sheets = index.map((sheet) => `${sheet.sheetName} (${sheet.rowCount} صف)`);
  const matches = index.reduce((sum, sheet) => sum + sheet.matches.length, 0);
  return { file, index, sheets, matches };
});

const lines = [
  "# فهرس ملفات الإحصاءات السياحية الجديدة",
  "",
  "| الملف | الأوراق | مؤشرات المطابقة |",
  "|---|---|---:|",
  ...rows.map((row) => `| ${row.file.replace(/\.json$/, "")} | ${row.sheets.join("<br>")} | ${row.matches} |`),
  "",
  "## عناوين وجداول تحتاج مراجعة تفصيلية",
  "",
];

for (const row of rows) {
  lines.push(`### ${row.file.replace(/\.json$/, "")}`);
  for (const sheet of row.index) {
    const candidates = sheet.matches.filter((item) => /(مدينة|مدن|مواقع|استثمار|مرشد|عمال|شركات|مكاتب|إيواء|فندق|غرف|أسرّة|اسرة|بنغازي|طرابلس|2020|2019|2018|2017)/.test(item.text)).slice(0, 25);
    if (candidates.length === 0) continue;
    lines.push(`- **${sheet.sheetName}**: ${candidates.map((item) => `س${item.row}: ${item.text}`).join(" — ")}`);
  }
  lines.push("");
}

fs.writeFileSync(output, `${lines.join("\n")}\n`, "utf8");
console.log(JSON.stringify({ output, files: rows.length, totalMatches: rows.reduce((sum, row) => sum + row.matches, 0) }, null, 2));
