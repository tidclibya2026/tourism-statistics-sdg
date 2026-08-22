import { describe, expect, it, vi } from "vitest";
import { exportSpatialPdf, exportSpatialPng } from "../client/src/lib/spatialExport";

describe("spatial export", () => {
  const element = {} as HTMLElement;

  it("downloads a PNG capture of the spatial summary", async () => {
    const download = vi.fn();
    await exportSpatialPng(element, "map.png", {
      capture: async () => ({ toDataURL: () => "data:image/png;base64,abc" }),
      download,
      exportPdf: vi.fn(),
    });
    expect(download).toHaveBeenCalledWith("data:image/png;base64,abc", "map.png");
  });

  it("delegates PDF creation to the common PDF exporter", async () => {
    const exportPdf = vi.fn().mockResolvedValue(undefined);
    await exportSpatialPdf(element, "map.pdf", {
      capture: async () => ({ toDataURL: () => "data:image/png;base64,abc" }),
      download: vi.fn(),
      exportPdf,
    });
    expect(exportPdf).toHaveBeenCalledWith(element, "map.pdf");
  });
});
