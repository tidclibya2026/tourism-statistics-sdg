import { describe, expect, it } from "vitest";
import { allYearsFilter, filterPublicationYear, getPublicationAvailableYears } from "../shared/publicationChartInteractions";

describe("تفاعل رسوم واجهات السياحة الرقمية", () => {
  it("يوفر سنوات متفردة مرتبة ويقصر العرض على السنة المختارة دون تغيير بيانات المصدر", () => {
    const coverage = [{ year: 2021, records: 10 }, { year: 2023, records: 12 }];
    const series = [{ year: 2022, value: 5 }, { year: 2023, value: 7 }];

    expect(getPublicationAvailableYears(coverage, series)).toEqual([2023, 2022, 2021]);
    expect(filterPublicationYear(series, "2023")).toEqual([{ year: 2023, value: 7 }]);
    expect(filterPublicationYear(series, allYearsFilter)).toEqual(series);
  });
});
