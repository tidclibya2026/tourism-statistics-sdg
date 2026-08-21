import { describe, expect, it } from "vitest";
import { toExcelReportRows } from "./reportExport";

describe("toExcelReportRows", () => {
  it("keeps the Arabic headers and transforms period and numeric values for Excel", () => {
    const rows = toExcelReportRows([{
      indicator: { code: "ARR-001", name: "الوافدون", axis: "اقتصادي", framework: "SDG", sdgReference: "SDG 8", unit: "عدد" },
      observation: { year: 2025, period: "quarterly", quarter: "Q2", value: "12.5", targetValue: null, source: null },
    }]);

    expect(rows).toEqual([expect.objectContaining({
      "رمز المؤشر": "ARR-001",
      الفترة: "الربع الثاني",
      القيمة: 12.5,
      "القيمة المستهدفة": "",
      المصدر: "",
    })]);
  });
});

