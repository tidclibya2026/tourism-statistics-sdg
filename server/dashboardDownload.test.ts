import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { createDashboardWorkbook } from "../client/src/lib/dashboardDownload";
import { exportDashboardPdf, getPdfImagePlacements } from "../client/src/lib/dashboardPdf";

const tinyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL1NwAAAABJRU5ErkJggg==";

describe("dashboard download artifacts", () => {
  it("embeds a dashboard chart image into the Excel workbook", async () => {
    const buffer = await createDashboardWorkbook({
      summary: { totalIndicators: 1, publishedIndicators: 1, approvedObservations: 1, latestYear: 2025, indicatorsWithTargets: 1, achievedTargets: 1 },
      trendByYear: [{ year: 2025, observations: 1 }], axisDistribution: [{ axis: "اقتصادي", count: 1 }],
      targetPerformance: [{ code: "A", name: "مؤشر", axis: "اقتصادي", unit: "عدد", year: 2025, actual: 1, target: 1, variance: 0, attainment: 100, status: "achieved" }],
    }, tinyPng);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const chartSheet = workbook.getWorksheet("مخطط تحقيق المستهدفات");
    expect(chartSheet).toBeDefined();
    expect(chartSheet?.getImages()).toHaveLength(1);
  });

  it("creates enough PDF placements for content longer than one landscape page", () => {
    expect(getPdfImagePlacements(1000, 2400, 842, 595).positions).toHaveLength(4);
  });

  it("captures the dashboard and writes all calculated pages to a PDF file", async () => {
    const calls = { images: 0, pages: 0, fileName: "" };
    await exportDashboardPdf({} as HTMLElement, "dashboard.pdf", {
      capture: async () => ({ width: 1000, height: 2400, toDataURL: () => "data:image/png;base64,test" }),
      createPdf: () => ({
        internal: { pageSize: { getWidth: () => 842, getHeight: () => 595 } },
        addImage: () => { calls.images += 1; },
        addPage: () => { calls.pages += 1; },
        save: (fileName) => { calls.fileName = fileName; },
      }),
    });
    expect(calls).toEqual({ images: 4, pages: 3, fileName: "dashboard.pdf" });
  });
});
