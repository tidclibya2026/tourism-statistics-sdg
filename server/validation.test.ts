import { describe, expect, it } from "vitest";
import { validateImportedObservations } from "./validation";

describe("validateImportedObservations", () => {
  const codes = new Set(["ARR-001", "EMP-001"]);

  it("accepts complete annual and quarterly rows", () => {
    const result = validateImportedObservations([
      { code: "ARR-001", year: 2025, period: "annual", value: 25.4 },
      { code: "EMP-001", year: 2025, period: "quarterly", quarter: "Q2", value: 1200, targetValue: 1300 },
    ], codes);

    expect(result.issues).toHaveLength(0);
    expect(result.accepted).toEqual([
      expect.objectContaining({ code: "ARR-001", quarter: "annual" }),
      expect.objectContaining({ code: "EMP-001", quarter: "Q2" }),
    ]);
  });

  it("reports unknown codes, invalid periods and duplicates without accepting invalid rows", () => {
    const result = validateImportedObservations([
      { code: "UNKNOWN", year: 2025, period: "annual", value: 1 },
      { code: "ARR-001", year: 2025, period: "quarterly", value: 1 },
      { code: "ARR-001", year: 2025, period: "annual", value: 1 },
      { code: "ARR-001", year: 2025, period: "annual", value: 2 },
    ], codes);

    expect(result.accepted).toHaveLength(1);
    expect(result.issues.map((issue) => issue.field)).toEqual(expect.arrayContaining(["code", "quarter", "period"]));
  });
});

