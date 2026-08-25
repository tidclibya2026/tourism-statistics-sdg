import { describe, expect, it } from "vitest";
import { getPost2021CityWorkflow } from "../shared/post2021CityWorkflow";

describe("واجهة سير عمل المدن بعد 2021", () => {
  it("تقتصر على قياسات المدن السنوية من 2022 وتمنع المراجعة الذاتية", () => {
    const result = getPost2021CityWorkflow([
      { id: 1, spatialAreaId: 10, year: 2022, period: "annual" as const, verificationStatus: "draft" as const, enteredBy: 7 },
      { id: 2, spatialAreaId: 10, year: 2023, period: "annual" as const, verificationStatus: "draft" as const, enteredBy: 8 },
      { id: 3, spatialAreaId: 10, year: 2024, period: "annual" as const, verificationStatus: "reviewed" as const, enteredBy: 8 },
      { id: 4, spatialAreaId: 10, year: 2024, period: "quarterly" as const, verificationStatus: "draft" as const, enteredBy: 8 },
      { id: 5, spatialAreaId: 10, year: 2021, period: "annual" as const, verificationStatus: "draft" as const, enteredBy: 8 },
      { id: 6, spatialAreaId: 20, year: 2024, period: "annual" as const, verificationStatus: "draft" as const, enteredBy: 8 },
    ], new Set([10]), 7);

    expect(result.drafts.map((row) => row.id)).toEqual([1, 2]);
    expect(result.reviewable.map((row) => row.id)).toEqual([2]);
    expect(result.reviewed.map((row) => row.id)).toEqual([3]);
  });
});
