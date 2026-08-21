import { describe, expect, it } from "vitest";
import { toExcelReportRows } from "../client/src/lib/reportExport";

describe("Excel report export", () => {
  it("serializes a verified observation into the approved Arabic export shape", () => {
    const rows = toExcelReportRows([{
      indicator: {
        code: "ARR-001",
        name: "إجمالي الوافدين",
        axis: "اقتصادي",
        framework: "SDG",
        sdgReference: "SDG 8",
        unit: "عدد",
      },
      observation: {
        year: 2025,
        period: "quarterly",
        quarter: "Q2",
        value: "4500.25",
        targetValue: null,
        source: "المنفذ الحدودي",
      },
    }]);

    expect(rows[0]).toEqual(expect.objectContaining({
      "رمز المؤشر": "ARR-001",
      الفترة: "الربع الثاني",
      القيمة: 4500.25,
      "القيمة المستهدفة": "",
      المصدر: "المنفذ الحدودي",
    }));
  });
});
