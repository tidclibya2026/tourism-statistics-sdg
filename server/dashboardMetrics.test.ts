import { describe, expect, it } from "vitest";
import { buildTargetPerformance } from "./dashboardMetrics";

describe("dashboard target performance", () => {
  it("uses the latest annual approved measurement per indicator and normalizes attainment", () => {
    const result = buildTargetPerformance([
      { indicator: { id: 1, name: "مؤشر أ", code: "A", axis: "اقتصادي", unit: "عدد" }, observation: { year: 2023, period: "annual", value: "80", targetValue: "100" } },
      { indicator: { id: 1, name: "مؤشر أ", code: "A", axis: "اقتصادي", unit: "عدد" }, observation: { year: 2024, period: "annual", value: "110", targetValue: "100" } },
      { indicator: { id: 2, name: "مؤشر ب", code: "B", axis: "بيئي", unit: "نسبة مئوية" }, observation: { year: 2024, period: "annual", value: "75", targetValue: "100" } },
    ]);

    expect(result).toEqual([
      expect.objectContaining({ indicatorId: 2, attainment: 75, status: "below_target" }),
      expect.objectContaining({ indicatorId: 1, actual: 110, target: 100, attainment: 110, variance: 10, status: "achieved" }),
    ]);
  });
});

