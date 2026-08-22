import ExcelJS from "exceljs";
import { toDashboardExportSheets, type DashboardExportData } from "./dashboardExport";

function appendRows(sheet: ExcelJS.Worksheet, rows: Record<string, string | number>[]) {
  const headers = Object.keys(rows[0] ?? { البند: "" });
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(headers.map((header) => row[header] ?? "")));
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F5C58" } };
  header.alignment = { horizontal: "right", vertical: "middle" };
  sheet.views = [{ rightToLeft: true }];
  sheet.columns.forEach((column) => { column.width = 20; });
}

export async function createDashboardWorkbook(data: DashboardExportData, chartImageDataUrl?: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "المرصد الوطني للسياحة";
  const sheets = toDashboardExportSheets(data);
  Object.entries(sheets).forEach(([name, rows]) => appendRows(workbook.addWorksheet(name), rows));

  const chartSheet = workbook.addWorksheet("مخطط تحقيق المستهدفات");
  chartSheet.views = [{ rightToLeft: true }];
  chartSheet.getCell("A1").value = "مخطط تحقيق المستهدفات";
  chartSheet.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF173F3D" } };
  if (chartImageDataUrl) {
    const imageId = workbook.addImage({ base64: chartImageDataUrl, extension: "png" });
    chartSheet.addImage(imageId, { tl: { col: 0, row: 2 }, ext: { width: 720, height: 340 } });
  } else {
    chartSheet.getCell("A3").value = "لا تتوفر بيانات كافية لإنشاء مخطط تحقيق المستهدفات.";
  }
  return workbook.xlsx.writeBuffer();
}

export async function downloadDashboardWorkbook(data: DashboardExportData, chartImageDataUrl?: string) {
  const buffer = await createDashboardWorkbook(data, chartImageDataUrl);
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `لوحة-المؤشرات-${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

