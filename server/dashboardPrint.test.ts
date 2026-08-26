import { describe, expect, it } from "vitest";
import { getPrintablePdfTitle } from "../client/src/lib/dashboardPdf";

describe("browser PDF print title", () => {
  it("removes only the PDF suffix for the Save as PDF dialog", () => {
    expect(getPrintablePdfTitle("تقرير-المؤشرات-2025.pdf")).toBe("تقرير-المؤشرات-2025");
    expect(getPrintablePdfTitle("تقرير-المؤشرات")).toBe("تقرير-المؤشرات");
  });
});
