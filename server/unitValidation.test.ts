import { describe, expect, it } from "vitest";
import { getUnitRule, validateUnitValues } from "../shared/unitValidation";

describe("unit-aware observation validation", () => {
  it("restricts percentage values to the 0–100 range", () => {
    expect(getUnitRule("نسبة مئوية").kind).toBe("percentage");
    expect(validateUnitValues("نسبة مئوية", 101)).toContain("القيمة تتجاوز الحد الأقصى 100 لأن وحدة القياس نسبة مئوية.");
  });

  it("requires integer values for count indicators and permits currency decimals", () => {
    expect(validateUnitValues("عدد الزوار", 10.5)).toContain("القيمة يجب أن تكون عدداً صحيحاً لأن وحدة القياس «عدد الزوار».");
    expect(validateUnitValues("د.ل", 123.45, 150)).toEqual([]);
  });

  it("rejects negative values for all supported tourism measurement units", () => {
    expect(validateUnitValues("ليلة", -1)).toContain("القيمة لا يمكن أن تكون سالبة وفق وحدة القياس «ليلة».");
  });
});

