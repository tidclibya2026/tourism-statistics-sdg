import { describe, expect, it } from "vitest";
import { validateImportedCityStatistics } from "../shared/cityStatisticsImport";

const cities = [{ id: 4, code: "CITY-TRIPOLI", type: "city" as const, status: "active" as const }];
const indicators = [{ id: 90001, code: "SPATIAL-TOURISM-SITES-COUNT", unit: "موقع" }];

const validRow = {
  "رمز المدينة": "CITY-TRIPOLI",
  "رمز المؤشر في المنصة": "SPATIAL-TOURISM-SITES-COUNT",
  "السنة المقدمة": 2024,
  "القيمة المقدمة": 18,
  "الوحدة المطلوبة": "موقع",
  "الفترة": "سنوي كامل",
  "المصدر الرسمي / اسم التقرير": "التقرير الإحصائي السياحي 2024",
  "رقم الجدول أو الصفحة": "جدول 5، ص 18",
  "رقم المرجع أو الرابط": "https://example.gov.ly/report-2024",
};

describe("validateImportedCityStatistics", () => {
  it("accepts a traceable complete annual city value and ignores empty request rows", () => {
    const result = validateImportedCityStatistics([validRow, { "رمز المدينة": "CITY-TRIPOLI", "رمز المؤشر في المنصة": "SPATIAL-TOURISM-SITES-COUNT" }], cities, indicators);
    expect(result.accepted).toEqual([expect.objectContaining({ cityCode: "CITY-TRIPOLI", indicatorCode: "SPATIAL-TOURISM-SITES-COUNT", year: 2024, value: 18 })]);
    expect(result.issues).toHaveLength(0);
    expect(result.ignoredRows).toBe(1);
  });

  it("rejects a partial period, unmatched unit, and missing source trace", () => {
    const result = validateImportedCityStatistics([{ ...validRow, "الفترة": "ربع أول", "الوحدة المطلوبة": "دينار ليبي", "المصدر الرسمي / اسم التقرير": "", "رقم المرجع أو الرابط": "" }], cities, indicators);
    expect(result.accepted).toHaveLength(0);
    expect(result.issues.map((issue) => issue.field)).toEqual(expect.arrayContaining(["الفترة", "الوحدة المطلوبة", "المصدر الرسمي / اسم التقرير", "رقم المرجع أو الرابط"]));
  });

  it("does not accept duplicate city-indicator-year values within one workbook", () => {
    const result = validateImportedCityStatistics([validRow, { ...validRow, "القيمة المقدمة": 19 }], cities, indicators);
    expect(result.accepted).toHaveLength(1);
    expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining("مكرر") })]));
  });
});
