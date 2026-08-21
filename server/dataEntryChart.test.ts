import { describe, expect, it } from "vitest";
import { buildDataEntryChartSeries } from "../client/src/lib/dataEntryChart";

describe("data entry chart series", () => {
  it("merges history, targets and projections into a chronological interactive chart series", () => {
    expect(buildDataEntryChartSeries(
      [{ year: 2022, value: 100, target: 110 }, { year: 2023, value: 120 }],
      [{ year: 2024, value: 135 }, { year: 2025, value: 150 }],
    )).toEqual([
      { year: 2022, actual: 100, target: 110 },
      { year: 2023, actual: 120, target: undefined },
      { year: 2024, forecast: 135 },
      { year: 2025, forecast: 150 },
    ]);
  });
});

