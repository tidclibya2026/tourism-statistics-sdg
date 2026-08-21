import { describe, expect, it } from "vitest";
import { getIndicatorProfileEntries } from "../client/src/lib/indicatorProfile";

describe("indicator profile entries", () => {
  it("exposes the selected indicator type, framework and measurement unit", () => {
    const entries = getIndicatorProfileEntries({
      code: "ARR-001",
      axis: "اقتصادي",
      framework: "SDG",
      sdgReference: "SDG 8",
      unit: "عدد",
      status: "published",
      officialSource: "مركز المعلومات",
      calculationMethod: "العد السنوي",
    });

    expect(entries).toEqual(expect.arrayContaining([
      { label: "نوع المؤشر (المحور)", value: "اقتصادي" },
      { label: "الإطار المرجعي", value: "SDG" },
      { label: "وحدة القياس", value: "عدد" },
    ]));
  });
});

