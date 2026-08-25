import { describe, expect, it } from "vitest";
import { toPublicationExportSheets } from "../client/src/lib/publicationShowcaseExport";

describe("تصدير واجهات البيانات السياحية", () => {
  it("يضم القياسات المعتمدة وفجوات المواقع والاستثمار في أوراق منفصلة", () => {
    const sheets = toPublicationExportSheets({
      destinations: [{ code: "visit_libya", name: "Visit Libya", status: "draft", description: null }],
      summary: { spatialApproved: 1, activeSpatialAreas: 49, latestYear: 2023 },
      analytics: {
        coverageByYear: [{ year: 2023, records: 1, cities: 1 }],
        indicatorSeries: [{ code: "SPATIAL-TOURISM-COMPANIES-COUNT", name: "الشركات", unit: "عدد", records: 1, points: [{ year: 2023, value: 5, records: 1, cities: 1 }] }],
        exportRecords: [{ areaCode: "CITY-A", areaName: "أ", indicatorCode: "SPATIAL-TOURISM-COMPANIES-COUNT", indicatorName: "الشركات", unit: "عدد", year: 2023, value: 5, source: "مصدر" }],
        gaps: [{ code: "SPATIAL-TOURISM-SITES-COUNT", label: "المواقع السياحية الموثقة", records: 0 }, { code: "SPATIAL-TOURISM-INVESTMENT-LYD", label: "الاستثمار السياحي السنوي", records: 0 }],
      },
    }, "وقت ثابت");

    expect(sheets["القياسات المعتمدة"][0]).toMatchObject({ المدينة: "أ", القيمة: 5, "حالة التحقق": "معتمد للنشر" });
    expect(sheets["فجوات المصادر"]).toEqual(expect.arrayContaining([expect.objectContaining({ الفئة: "المواقع السياحية الموثقة", الحالة: "مصدر سنوي مدني مطلوب" })]));
  });
});
