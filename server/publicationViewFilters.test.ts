import { describe, expect, it } from "vitest";
import { allCitiesFilter, buildPublicationCoverage, buildPublicationSeries, filterPublicationRecords, getPublicationCities, searchAndSortPublicationRecords } from "../shared/publicationViewFilters";

const records = [
  { areaCode: "TRIPOLI", areaName: "طرابلس", indicatorCode: "COMPANIES", indicatorName: "الشركات", unit: "عدد", year: 2021, value: 4, source: "س1" },
  { areaCode: "BENGHAZI", areaName: "بنغازي", indicatorCode: "COMPANIES", indicatorName: "الشركات", unit: "عدد", year: 2021, value: 6, source: "س1" },
  { areaCode: "TRIPOLI", areaName: "طرابلس", indicatorCode: "COMPANIES", indicatorName: "الشركات", unit: "عدد", year: 2022, value: 8, source: "س2" },
  { areaCode: "TRIPOLI", areaName: "طرابلس", indicatorCode: "BEDS", indicatorName: "الأسرة", unit: "عدد", year: 2022, value: 10, source: "س2" },
];

describe("فلترة وعرض قياسات واجهات السياحة الرقمية", () => {
  it("يحصر المدينة والسنة والمؤشر عند بناء الرسم والجدول", () => {
    const filters = { cityCode: "TRIPOLI", year: "2022", indicatorCode: "COMPANIES" };
    expect(filterPublicationRecords(records, filters)).toHaveLength(1);
    expect(buildPublicationSeries(records, filters)).toEqual([{ year: 2022, value: 8, records: 1, cities: 1 }]);
    expect(buildPublicationCoverage(records, filters)).toEqual([{ year: 2022, records: 2, cities: 1 }]);
  });

  it("ينشئ خيارات مدينة ويبحث ويفرز الجدول من النتائج المفلترة", () => {
    expect(getPublicationCities(records)).toEqual([{ code: "BENGHAZI", name: "بنغازي" }, { code: "TRIPOLI", name: "طرابلس" }]);
    expect(searchAndSortPublicationRecords(records, "طراب", "year", "desc").map((record) => record.year)).toEqual([2022, 2022, 2021]);
    expect(buildPublicationCoverage(records, { cityCode: allCitiesFilter, year: "2021" })).toEqual([{ year: 2021, records: 2, cities: 2 }]);
  });
});
