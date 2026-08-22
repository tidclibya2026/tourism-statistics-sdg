import { describe, expect, it } from "vitest";
import { buildLocationQuickStats } from "../shared/spatialQuickStats";

describe("spatial quick statistics", () => {
  it("uses approved-location rows to summarize a city and its parent region", () => {
    const region = { id: 1, type: "region" as const, parentId: null };
    const benghazi = { id: 2, type: "city" as const, parentId: 1 };
    const tripoli = { id: 3, type: "city" as const, parentId: null };
    const summaries = buildLocationQuickStats([region, benghazi, tripoli], [benghazi, tripoli], [
      { areaId: 2, year: 2024, value: 40, unit: "عدد", indicatorName: "النزلاء" },
      { areaId: 2, year: 2025, value: 50, unit: "عدد", indicatorName: "النزلاء" },
      { areaId: 3, year: 2025, value: 11, unit: "عدد", indicatorName: "المرافق" },
    ]);

    expect(summaries.get(2)).toMatchObject({ count: 2, latestYear: 2025, latestValue: 50, indicatorName: "النزلاء" });
    expect(summaries.get(1)).toMatchObject({ count: 2, latestYear: 2025, latestValue: 50 });
    expect(summaries.get(3)).toMatchObject({ count: 1, latestYear: 2025, latestValue: 11 });
  });
});
