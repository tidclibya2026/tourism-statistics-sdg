import { describe, expect, it, vi } from "vitest";
import { getPrintablePdfTitle, returnToApplicationAfterPrint } from "../client/src/lib/dashboardPdf";

describe("browser PDF print title", () => {
  it("removes only the PDF suffix for the Save as PDF dialog", () => {
    expect(getPrintablePdfTitle("تقرير-المؤشرات-2025.pdf")).toBe("تقرير-المؤشرات-2025");
    expect(getPrintablePdfTitle("تقرير-المؤشرات")).toBe("تقرير-المؤشرات");
  });

  it("closes the print window and returns focus to the application after printing", () => {
    let afterPrint: (() => void) | undefined;
    const printWindow = {
      closed: false,
      addEventListener: vi.fn((event: string, handler: () => void) => { if (event === "afterprint") afterPrint = handler; }),
      close: vi.fn(),
      focus: vi.fn(),
    } as any;
    const sourceWindow = { focus: vi.fn(), setTimeout: (handler: () => void) => { handler(); return 0; } } as any;

    returnToApplicationAfterPrint(printWindow, sourceWindow);
    afterPrint?.();

    expect(printWindow.close).toHaveBeenCalledOnce();
    expect(sourceWindow.focus).toHaveBeenCalledOnce();
  });
});
