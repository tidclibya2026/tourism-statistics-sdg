import { describe, expect, it } from "vitest";
import { addCityToComparison, cityMapQueryDefaults, selectComparisonPoint } from "../shared/cityMapInteraction";

describe("city map interaction helpers", () => {
  it("fills the two comparison slots and then keeps the newest two selections", () => {
    expect(addCityToComparison({ primary: "all", secondary: "all" }, 4)).toEqual({ primary: "4", secondary: "all" });
    expect(addCityToComparison({ primary: "4", secondary: "all" }, 9)).toEqual({ primary: "4", secondary: "9" });
    expect(addCityToComparison({ primary: "4", secondary: "9" }, 12)).toEqual({ primary: "9", secondary: "12" });
  });

  it("chooses only an approved-page compatible point for the selected city, indicator and year", () => {
    const points = [
      { id: 1, areaId: 4, areaName: "طرابلس", indicatorId: 8, year: 2013, value: 45, unit: "مرفق" },
      { id: 2, areaId: 4, areaName: "طرابلس", indicatorId: 8, year: 2014, value: 50, unit: "مرفق" },
      { id: 3, areaId: 4, areaName: "طرابلس", indicatorId: 9, year: 2014, value: 200, unit: "غرفة" },
    ];
    expect(selectComparisonPoint(points, "4", "8", "all")?.id).toBe(2);
    expect(selectComparisonPoint(points, "4", "8", "2013")?.value).toBe(45);
    expect(selectComparisonPoint(points, "4", "all", "all")).toBeUndefined();
  });

  it("keeps city-map data warm without refetching when the tab regains focus", () => {
    expect(cityMapQueryDefaults.staleTime).toBe(300000);
    expect(cityMapQueryDefaults.refetchOnWindowFocus).toBe(false);
  });
});
