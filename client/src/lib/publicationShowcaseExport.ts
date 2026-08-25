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

export function toPublicationExportSheets(data: PublicationShowcaseExportData, generatedAt = new Date().toLocaleString("ar-LY")) {
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
  };
}

export async function createPublicationWorkbook(data: PublicationShowcaseExportData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "المرصد الوطني للإحصاءات والمؤشرات السياحية";
  const sheets = toPublicationExportSheets(data);
  Object.entries(sheets).forEach(([name, rows]) => appendRows(workbook.addWorksheet(name), rows));
  return workbook.xlsx.writeBuffer();
}

export async function downloadPublicationWorkbook(data: PublicationShowcaseExportData) {
  const buffer = await createPublicationWorkbook(data);
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `واجهات-السياحة-الرقمية-${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
