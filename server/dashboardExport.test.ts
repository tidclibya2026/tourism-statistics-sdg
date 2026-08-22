import { describe, expect, it } from "vitest";
import { toDashboardExportSheets } from "../client/src/lib/dashboardExport";

describe("dashboard export sheets", () => {
  it("builds Arabic Excel-ready sheets for summary, goals and chart data", () => {
    const sheets = toDashboardExportSheets({
      summary: { totalIndicators: 3, publishedIndicators: 2, approvedObservations: 8, latestYear: 2025, indicatorsWithTargets: 2, achievedTargets: 1 },
      trendByYear: [{ year: 2025, observations: 4 }],
      axisDistribution: [{ axis: "اقتصادي", count: 2 }],
      targetPerformance: [{ code: "ARR-001", name: "الوافدون", axis: "اقتصادي", unit: "عدد", year: 2025, actual: 90, target: 100, variance: -10, attainment: 90, status: "below_target" }],
    }, "2026-08-22");

    expect(sheets["ملخص اللوحة"][0]).toEqual({ البند: "تاريخ التصدير", القيمة: "2026-08-22" });
    expect(sheets["تحقيق المستهدفات"][0]).toMatchObject({ "رمز المؤشر": "ARR-001", "نسبة التحقيق %": 90, الحالة: "دون المستهدف" });
    expect(sheets["بيانات الرسوم"][0]).toEqual({ السنة: 2025, "القياسات السنوية المعتمدة": 4 });
  });
});

