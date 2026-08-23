import { describe, expect, it } from "vitest";
import { areUnitsComparable, buildActualComparisonSeries, buildIndexedComparisonSeries, summarizeComparisonSeries } from "../shared/comparisonSeries";

const indicators = [
  { id: 1, name: "الزوار", unit: "عدد" },
  { id: 2, name: "الإيرادات", unit: "مليون دينار" },
];
const rows = [
  { indicatorId: 1, year: 2020, value: 100 },
  { indicatorId: 1, year: 2022, value: 150 },
  { indicatorId: 2, year: 2020, value: 20 },
  { indicatorId: 2, year: 2022, value: 25 },
];

describe("comparison series", () => {
  it("keeps actual values available only to same-unit comparisons", () => {
    expect(areUnitsComparable(indicators)).toBe(false);
    expect(areUnitsComparable([{ id: 1, name: "أ", unit: "عدد" }, { id: 2, name: "ب", unit: "عدد" }])).toBe(true);
    expect(buildActualComparisonSeries(indicators, rows)).toEqual([
      { year: 2020, "الزوار": 100, "الإيرادات": 20 },
      { year: 2022, "الزوار": 150, "الإيرادات": 25 },
    ]);
  });

  it("indexes mixed-unit series to their first approved annual value", () => {
    expect(buildIndexedComparisonSeries(indicators, rows)).toEqual([
      { year: 2020, "الزوار": 100, "الإيرادات": 100 },
      { year: 2022, "الزوار": 150, "الإيرادات": 125 },
    ]);
    expect(summarizeComparisonSeries(indicators, rows)[0]).toMatchObject({ changePercent: 50, last: { year: 2022, value: 150 } });
  });
});
