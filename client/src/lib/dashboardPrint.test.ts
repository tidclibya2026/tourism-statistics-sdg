import { describe, expect, it } from "vitest";
import { getPrintablePdfTitle } from "./dashboardPdf";

describe("getPrintablePdfTitle", () => {
  it("uses a clean Arabic document title for the browser Save as PDF dialog", () => {
    expect(getPrintablePdfTitle("تقرير-المؤشرات-2025.pdf")).toBe("تقرير-المؤشرات-2025");
    expect(getPrintablePdfTitle("تقرير-المؤشرات")).toBe("تقرير-المؤشرات");
  });
});
