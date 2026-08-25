import ExcelJS from "exceljs";

type PublicationShowcaseExportData = {
  destinations: { code: string; name: string; status: string; description: string | null }[];
  summary: { spatialApproved: number; activeSpatialAreas: number; latestYear: number | null };
  analytics: {
    indicatorSeries: { code: string; name: string; unit: string; records: number; points: { year: number; value: number; records: number; cities: number }[] }[];
    coverageByYear: { year: number; records: number; cities: number }[];
    gaps: { code: string; label: string; records: number }[];
    exportRecords: { areaCode: string; areaName: string; indicatorCode: string; indicatorName: string; unit: string; year: number; value: number; source: string | null }[];
  };
};

export type PublicationAnalysisExport = {
  cityName?: string;
  comparisonCityName?: string;
  rankDirectionLabel?: string;
  rankHistory?: { year: number; rank: number; total: number; value: number; unit: string }[];
  latestComparison?: { year: number; difference?: number; percentage?: number | null } | null;
  threshold?: number | null;
  thresholdExceeded?: boolean;
};

export type PublicationTopCitiesExport = {
  indicatorName: string;
  unit: string;
  directionLabel: string;
  groups: { year: number; cities: { rank: number; areaName: string; value: number; unit: string }[] }[];
};

type CellValue = string | number;

function appendRows(sheet: ExcelJS.Worksheet, rows: Record<string, CellValue>[]) {
  const headers = Object.keys(rows[0] ?? { البند: "" });
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(headers.map((header) => row[header] ?? "")));
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF176579" } };
  header.alignment = { horizontal: "right", vertical: "middle" };
  sheet.views = [{ rightToLeft: true }];
  sheet.columns.forEach((column) => { column.width = 23; });
}

export function toTopCitiesExportRows(input: PublicationTopCitiesExport) {
  const rows = input.groups.flatMap((group) => group.cities.map((city) => ({
    السنة: group.year,
    الرتبة: city.rank,
    المدينة: city.areaName,
    القيمة: city.value,
    الوحدة: city.unit,
    المؤشر: input.indicatorName,
    "اتجاه الترتيب": input.directionLabel,
  })));
  return rows.length ? rows : [{ ملاحظة: "لا توجد قائمة مدن مطابقة للتصدير ضمن الفلاتر الحالية." }];
}

export async function downloadTopCitiesWorkbook(input: PublicationTopCitiesExport) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "المرصد الوطني للإحصاءات والمؤشرات السياحية";
  appendRows(workbook.addWorksheet("أفضل خمس مدن"), toTopCitiesExportRows(input));
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `أفضل-خمس-مدن-${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

export function toPublicationExportSheets(data: PublicationShowcaseExportData, generatedAt = new Date().toLocaleString("ar-LY"), analysis?: PublicationAnalysisExport) {
  const seriesRows = data.analytics.indicatorSeries.flatMap((series) => series.points.map((point) => ({
    "رمز المؤشر": series.code,
    المؤشر: series.name,
    الوحدة: series.unit,
    السنة: point.year,
    "إجمالي القياسات المنشورة": point.value,
    "عدد سجلات المدن": point.records,
    "عدد المدن المغطاة": point.cities,
  })));
  return {
    "ملخص الحزمة": [
      { البند: "تاريخ التصدير", القيمة: generatedAt },
      { البند: "القياسات المدنية المعتمدة", القيمة: data.summary.spatialApproved },
      { البند: "المدن والمواقع المفهرسة", القيمة: data.summary.activeSpatialAreas },
      { البند: "آخر سنة بيانات", القيمة: data.summary.latestYear ?? "غير متاحة" },
      ...data.destinations.map((destination) => ({ البند: `حالة ${destination.name}`, القيمة: destination.status === "ready" ? "جاهزة للربط" : destination.status === "paused" ? "موقوفة" : "عرض محلي فقط" })),
    ],
    "تغطية المدن": data.analytics.coverageByYear.map((item) => ({ السنة: item.year, "عدد القياسات المعتمدة": item.records, "عدد المدن المغطاة": item.cities })),
    "سلاسل المؤشرات": seriesRows.length ? seriesRows : [{ ملاحظة: "لا توجد قياسات مدنية معتمدة قابلة للرسم حالياً." }],
    "القياسات المعتمدة": data.analytics.exportRecords.length ? data.analytics.exportRecords.map((record) => ({
      المدينة: record.areaName,
      "رمز المدينة": record.areaCode,
      المؤشر: record.indicatorName,
      "رمز المؤشر": record.indicatorCode,
      السنة: record.year,
      القيمة: record.value,
      الوحدة: record.unit,
      المصدر: record.source ?? "غير مسجل",
      "حالة التحقق": "معتمد للنشر",
    })) : [{ ملاحظة: "لا توجد قياسات مدنية معتمدة في نطاق هذه الحزمة." }],
    "فجوات المصادر": data.analytics.gaps.map((gap) => ({
      "رمز الفئة": gap.code,
      الفئة: gap.label,
      "عدد القياسات المعتمدة": gap.records,
      الحالة: gap.records > 0 ? "توجد بيانات معتمدة" : "مصدر سنوي مدني مطلوب",
    })),
    "تغير رتبة المدينة": analysis?.rankHistory?.length ? analysis.rankHistory.map((point) => ({
      المدينة: analysis.cityName ?? "المدينة المختارة",
      السنة: point.year,
      الرتبة: point.rank,
      "إجمالي المدن المقارنة": point.total,
      القيمة: point.value,
      الوحدة: point.unit,
      "اتجاه الترتيب": analysis.rankDirectionLabel ?? "الأعلى قيمة أولاً",
    })) : [{ ملاحظة: "لم يُحدد عرض رتبة مدينة صالح للتصدير." }],
    "تنبيه فرق المقارنة": [{
      "المدينة الرئيسية": analysis?.cityName ?? "غير محددة",
      "مدينة المقارنة": analysis?.comparisonCityName ?? "غير محددة",
      "سنة المقارنة": analysis?.latestComparison?.year ?? "غير متاحة",
      "فرق القيمة": analysis?.latestComparison?.difference ?? "غير متاح",
      "نسبة الفرق (%)": analysis?.latestComparison?.percentage ?? "غير متاحة",
      "الحد المحدد (%)": analysis?.threshold ?? "غير محدد",
      الحالة: analysis?.threshold === null || analysis?.threshold === undefined ? "لم يُحدد حد" : analysis.thresholdExceeded ? "تم تجاوز الحد" : "ضمن الحد",
    }],
  };
}

async function renderRankChartPng(points: NonNullable<PublicationAnalysisExport["rankHistory"]>) {
  if (typeof document === "undefined" || !points.length) return null;
  const width = 760; const height = 320; const padding = 42; const maxRank = Math.max(...points.map((point) => point.rank), 1);
  const coordinates = points.map((point, index) => ({ x: padding + index * ((width - padding * 2) / Math.max(points.length - 1, 1)), y: padding + (point.rank - 1) * ((height - padding * 2) / Math.max(maxRank - 1, 1)) }));
  const polyline = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const labels = points.map((point, index) => `<text x="${coordinates[index]?.x}" y="${height - 16}" text-anchor="middle" font-size="12" fill="#5c6f6b">${point.year}</text>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#f8fbfa"/><text x="${width - padding}" y="24" text-anchor="end" font-size="16" font-family="Arial" fill="#173f3c">تغير رتبة المدينة (1 الأفضل)</text><line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#cfe0da"/><line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#cfe0da"/><polyline points="${polyline}" fill="none" stroke="#d49a3f" stroke-width="4"/>${coordinates.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="5" fill="#176579"/>`).join("")}${labels}</svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = url; });
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d"); if (!context) return null;
    context.drawImage(image, 0, 0);
    return canvas.toDataURL("image/png");
  } finally { URL.revokeObjectURL(url); }
}

export async function createPublicationWorkbook(data: PublicationShowcaseExportData, analysis?: PublicationAnalysisExport) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "المرصد الوطني للإحصاءات والمؤشرات السياحية";
  const sheets = toPublicationExportSheets(data, undefined, analysis);
  Object.entries(sheets).forEach(([name, rows]) => appendRows(workbook.addWorksheet(name), rows));
  if (analysis?.rankHistory?.length) {
    const image = await renderRankChartPng(analysis.rankHistory);
    const rankSheet = workbook.getWorksheet("تغير رتبة المدينة");
    if (image && rankSheet) { const imageId = workbook.addImage({ base64: image, extension: "png" }); rankSheet.addImage(imageId, "I2:U18"); }
  }
  return workbook.xlsx.writeBuffer();
}

export async function downloadPublicationWorkbook(data: PublicationShowcaseExportData, analysis?: PublicationAnalysisExport) {
  const buffer = await createPublicationWorkbook(data, analysis);
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `واجهات-السياحة-الرقمية-${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
