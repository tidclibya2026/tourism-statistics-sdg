import { describe, expect, it } from "vitest";
import { buildSpatialColorScale, neutralColor, noDataColor } from "../shared/spatialColorScale";

describe("spatial color scale", () => {
  const points = [
    { areaId: 1, year: 2024, value: 10, unit: "عدد" },
    { areaId: 1, year: 2025, value: 30, unit: "عدد" },
    { areaId: 2, year: 2025, value: 90, unit: "عدد" },
  ];

  it("uses the latest approved value for each location and maps the range to colors", () => {
    const scale = buildSpatialColorScale(points, true);
    expect(scale.latestByArea.get(1)).toMatchObject({ year: 2025, value: 30 });
    expect(scale.min).toBe(30);
    expect(scale.max).toBe(90);
    expect(scale.colorFor(1)).not.toBe(scale.colorFor(2));
    expect(scale.colorFor(999)).toBe(noDataColor);
  });

  it("preserves a neutral color until the user selects an indicator", () => {
    const scale = buildSpatialColorScale(points, false);
    expect(scale.colorFor(1)).toBe(neutralColor);
    expect(scale.colorFor(2)).toBe(neutralColor);
  });
});
