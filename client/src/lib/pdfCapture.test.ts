import { describe, expect, it } from "vitest";
import { PDF_CAPTURE_ROOT_ATTRIBUTE, preparePdfCaptureDocument } from "./pdfCapture";

describe("preparePdfCaptureDocument", () => {
  it("converts the cloned report to a light sRGB-compatible PDF capture theme", () => {
    const clonedDocument = document.implementation.createHTMLDocument("PDF");
    clonedDocument.body.innerHTML = `<section ${PDF_CAPTURE_ROOT_ATTRIBUTE}><p>تقرير</p></section>`;

    preparePdfCaptureDocument(clonedDocument);

    expect(clonedDocument.querySelector(`[${PDF_CAPTURE_ROOT_ATTRIBUTE}]`)?.classList.contains("pdf-render-root")).toBe(true);
    expect(clonedDocument.head.querySelector("style")?.textContent).toContain("--background: #ffffff");
    expect(clonedDocument.head.querySelector("style")?.textContent).not.toContain("oklch(");
  });

  it("does not add a theme when the clone has no report root", () => {
    const clonedDocument = document.implementation.createHTMLDocument("PDF");

    preparePdfCaptureDocument(clonedDocument);

    expect(clonedDocument.head.querySelector("style")).toBeNull();
  });
});
