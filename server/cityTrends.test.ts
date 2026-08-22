import { describe, expect, it } from "vitest";
import { buildCityTrendSeries } from "../shared/cityTrends";

describe("city trend rankings", () => {
  it("ranks each city within the same year and excludes regional records", () => {
    const result = buildCityTrendSeries([{ id: 1, name: "طرابلس" }, { id: 2, name: "بنغازي" }], [
      { areaId: 1, areaType: "city", year: 2024, value: 80, unit: "عدد" },
      { areaId: 2, areaType: "city", year: 2024, value: 100, unit: "عدد" },
      { areaId: 1, areaType: "city", year: 2025, value: 120, unit: "عدد" },
      { areaId: 99, areaType: "region", year: 2025, value: 999, unit: "عدد" },
    ]);
    expect(result.years).toEqual([2024, 2025]);
    expect(result.series).toEqual([
      { year: 2024, rank: 1, cityId: 2, cityName: "بنغازي", value: 100, unit: "عدد" },
      { year: 2024, rank: 2, cityId: 1, cityName: "طرابلس", value: 80, unit: "عدد" },
      { year: 2025, rank: 1, cityId: 1, cityName: "طرابلس", value: 120, unit: "عدد" },
    ]);
  });
});
