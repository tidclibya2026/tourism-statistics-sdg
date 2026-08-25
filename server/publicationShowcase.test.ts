import { describe, expect, it } from "vitest";
import { buildPublicationShowcaseAnalytics } from "../shared/publicationShowcase";

describe("بيانات واجهات Visit Libya وأطلس ليبيا", () => {
  it("يجمع كل سلسلة لمؤشر واحد ووحدة واحدة، ويبقي فجوات المواقع والاستثمار صريحة", () => {
    const result = buildPublicationShowcaseAnalytics([
      { id: 1, areaCode: "CITY-A", areaName: "أ", areaType: "city", indicatorId: 5, indicatorCode: "SPATIAL-TOURISM-COMPANIES-COUNT", indicatorName: "الشركات", unit: "عدد", year: 2022, value: 4, source: "مصدر" },
      { id: 2, areaCode: "CITY-B", areaName: "ب", areaType: "city", indicatorId: 5, indicatorCode: "SPATIAL-TOURISM-COMPANIES-COUNT", indicatorName: "الشركات", unit: "عدد", year: 2022, value: 6, source: "مصدر" },
      { id: 3, areaCode: "CITY-A", areaName: "أ", areaType: "city", indicatorId: 5, indicatorCode: "SPATIAL-TOURISM-COMPANIES-COUNT", indicatorName: "الشركات", unit: "عدد", year: 2023, value: 8, source: "مصدر" },
      { id: 4, areaCode: "REG-A", areaName: "إقليم", areaType: "region", indicatorId: 5, indicatorCode: "SPATIAL-TOURISM-COMPANIES-COUNT", indicatorName: "الشركات", unit: "عدد", year: 2023, value: 999, source: "مصدر" },
    ]);

    expect(result.indicatorSeries[0]?.points).toEqual([
      { year: 2022, value: 10, records: 2, cities: 2 },
      { year: 2023, value: 8, records: 1, cities: 1 },
    ]);
    expect(result.coverageByYear).toEqual([{ year: 2022, records: 2, cities: 2 }, { year: 2023, records: 1, cities: 1 }]);
    expect(result.gaps).toEqual([
      { code: "SPATIAL-TOURISM-SITES-COUNT", label: "المواقع السياحية الموثقة", records: 0 },
      { code: "SPATIAL-TOURISM-INVESTMENT-LYD", label: "الاستثمار السياحي السنوي", records: 0 },
    ]);
  });
});
