import { describe, expect, it } from "vitest";
import { filterHelpSections, getTourSteps } from "../client/src/lib/helpContent";

describe("help support content", () => {
  it("يعرض البحث أقساماً متاحة للدور الحالي فقط", () => {
    const viewerResults = filterHelpSections("اعتماد", "viewer");
    expect(viewerResults.some((section) => section.id === "approval")).toBe(false);
    expect(filterHelpSections("Excel", "analyst").map((section) => section.id)).toContain("import");
  });

  it("يبني جولة مختلفة للمدخل والمسؤول", () => {
    const analystTour = getTourSteps("analyst");
    const adminTour = getTourSteps("admin");
    expect(analystTour.some((step) => step.title === "إدخال البيانات")).toBe(true);
    expect(adminTour.some((step) => step.title === "اعتماد القياسات")).toBe(true);
    expect(adminTour.length).toBeGreaterThan(analystTour.length - 1);
  });
});
