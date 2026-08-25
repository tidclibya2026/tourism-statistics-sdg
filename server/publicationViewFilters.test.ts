import { describe, expect, it } from "vitest";
import { addCityComparisonDifferences, allCitiesFilter, assessComparisonThreshold, buildCityComparisonSeries, buildCityCoverageComparison, buildPublicationCityRankHistory, buildPublicationCoverage, buildPublicationSeries, buildPublicationTopCitiesByYear, calculateCityDifference, filterPublicationRecords, getCityComparisonRecords, getPublicationCities, getPublicationCityRank, searchAndSortPublicationRecords, summarizePublicationValueRange } from "../shared/publicationViewFilters";

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

  it("يحسب أدنى وأعلى قيمة للمدينة ويبني مقارنة مدينتين من المؤشر والوحدة نفسيهما", () => {
    const filters = { cityCode: "TRIPOLI", year: "all", indicatorCode: "COMPANIES" };
    expect(summarizePublicationValueRange(records, filters)).toMatchObject({ records: 2, minimum: { year: 2021, value: 4 }, maximum: { year: 2022, value: 8 } });
    expect(buildCityComparisonSeries(records, { year: "all", indicatorCode: "COMPANIES", primaryCityCode: "TRIPOLI", comparisonCityCode: "BENGHAZI" })).toEqual([{ year: 2021, primaryValue: 4, comparisonValue: 6 }, { year: 2022, primaryValue: 8 }]);
    expect(buildCityCoverageComparison(records, { year: "2021", primaryCityCode: "TRIPOLI", comparisonCityCode: "BENGHAZI" })).toEqual([{ year: 2021, primaryRecords: 1, comparisonRecords: 1 }]);
    expect(getCityComparisonRecords(records, { year: "2021", indicatorCode: "COMPANIES", primaryCityCode: "TRIPOLI", comparisonCityCode: "BENGHAZI" })).toHaveLength(2);
  });

  it("يحسب فرق المقارنة ونسبته بأمان ويرتب المدينة في سنة ومؤشر ووحدة موحدة", () => {
    expect(calculateCityDifference(8, 6)).toEqual({ difference: 2, percentage: 33.33333333333333 });
    expect(calculateCityDifference(8, 0)).toEqual({ difference: 8, percentage: null });
    expect(addCityComparisonDifferences([{ year: 2021, primaryValue: 4, comparisonValue: 6 }])).toMatchObject([{ difference: -2, percentage: -33.33333333333333 }]);
    expect(getPublicationCityRank(records, { year: "2021", indicatorCode: "COMPANIES", cityCode: "TRIPOLI" })).toEqual({ rank: 2, total: 2, year: 2021, value: 4, unit: "عدد" });
    expect(getPublicationCityRank(records, { year: "all", indicatorCode: "COMPANIES", cityCode: "TRIPOLI" })).toMatchObject({ rank: 1, total: 1, year: 2022, value: 8 });
  });

  it("يبني سجل رتبة المدينة ويقيّم حد فرق المقارنة بالقيمة المطلقة", () => {
    expect(buildPublicationCityRankHistory(records, { indicatorCode: "COMPANIES", cityCode: "TRIPOLI" })).toEqual([
      { year: 2021, rank: 2, total: 2, value: 4, unit: "عدد" },
      { year: 2022, rank: 1, total: 1, value: 8, unit: "عدد" },
    ]);
    expect(assessComparisonThreshold(-33.5, 30)).toEqual({ available: true, exceeded: true, magnitude: 33.5 });
    expect(assessComparisonThreshold(20, 30)).toEqual({ available: true, exceeded: false, magnitude: 20 });
    expect(assessComparisonThreshold(null, 30)).toEqual({ available: false, exceeded: false, magnitude: null });
  });

  it("يعكس اتجاه الترتيب ويعرض المدن الخمس الأفضل لكل سنة دون خلط الوحدة", () => {
    expect(getPublicationCityRank(records, { year: "2021", indicatorCode: "COMPANIES", cityCode: "TRIPOLI", direction: "ascending" })).toMatchObject({ rank: 1, total: 2 });
    expect(buildPublicationTopCitiesByYear(records, { indicatorCode: "COMPANIES", unit: "عدد", year: "2021", direction: "descending" })).toEqual([{ year: 2021, cities: [{ rank: 1, areaCode: "BENGHAZI", areaName: "بنغازي", value: 6, unit: "عدد" }, { rank: 2, areaCode: "TRIPOLI", areaName: "طرابلس", value: 4, unit: "عدد" }] }]);
    expect(buildPublicationTopCitiesByYear(records, { indicatorCode: "COMPANIES", unit: "عدد", year: "2021", direction: "ascending" })[0]?.cities[0]).toMatchObject({ areaCode: "TRIPOLI", rank: 1 });
  });
});
