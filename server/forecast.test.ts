import { describe, expect, it } from "vitest";
import { calculateAnnualForecast } from "./forecast";

describe("calculateAnnualForecast", () => {
  it("derives CAGR from approved annual history and projects future years", () => {
    const result = calculateAnnualForecast({
      history: [{ year: 2022, value: 100 }, { year: 2023, value: 110 }, { year: 2024, value: 121 }],
      method: "historical_cagr",
      horizon: 2,
    });

    expect(result.historicalCagr).toBeCloseTo(0.1, 6);
    expect(result.appliedRate).toBeCloseTo(0.1, 6);
    expect(result.forecast[0]).toMatchObject({ year: 2025, type: "forecast" });
    expect(result.forecast[0]?.value).toBeCloseTo(133.1, 6);
    expect(result.forecast[1]).toMatchObject({ year: 2026, type: "forecast" });
    expect(result.forecast[1]?.value).toBeCloseTo(146.41, 6);
  });

  it("uses an explicitly selected custom rate instead of historical CAGR", () => {
    const result = calculateAnnualForecast({
      history: [{ year: 2022, value: 100 }, { year: 2023, value: 110 }],
      method: "custom_rate",
      customRate: 0.08,
      horizon: 1,
    });

    expect(result.appliedRate).toBe(0.08);
    expect(result.forecast[0]).toMatchObject({ year: 2024, type: "forecast" });
    expect(result.forecast[0]?.value).toBeCloseTo(118.8, 6);
  });

  it("rejects forecasts with fewer than two annual points", () => {
    expect(() => calculateAnnualForecast({ history: [{ year: 2024, value: 100 }], method: "historical_cagr", horizon: 2 })).toThrow("قياسين سنويين");
  });
});
