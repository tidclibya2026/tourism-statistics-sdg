import { describe, expect, it } from "vitest";
import { getPdfCaptureOptions } from "./dashboardPdf";

describe("getPdfCaptureOptions", () => {
  it("uses the browser-native foreignObject capture path for modern CSS colors", () => {
    expect(getPdfCaptureOptions("#ffffff")).toEqual({
      scale: 1.5,
      backgroundColor: "#ffffff",
      useCORS: true,
      foreignObjectRendering: true,
      logging: false,
    });
  });
});
