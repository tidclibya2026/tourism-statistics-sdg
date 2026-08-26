import { describe, expect, it } from "vitest";
import { formatYear } from "../client/src/lib/tourism";

describe("formatYear", () => {
  it("يعرض السنة كاملة بلا فاصل آلاف", () => {
    expect(formatYear(2025)).toBe("2025");
    expect(formatYear("1994")).toBe("1994");
    expect(formatYear(2025.9)).toBe("2025");
  });

  it("يعرض شرطة عند غياب سنة صالحة", () => {
    expect(formatYear(undefined)).toBe("—");
    expect(formatYear("سنة غير صالحة")).toBe("—");
  });
});
