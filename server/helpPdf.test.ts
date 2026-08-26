// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const html2canvasMock = vi.hoisted(() => vi.fn());
const pdfMock = vi.hoisted(() => ({ addImage: vi.fn(), addPage: vi.fn(), save: vi.fn(), internal: { pageSize: { getWidth: () => 595, getHeight: () => 842 } } }));
const jsPDFMock = vi.hoisted(() => vi.fn(() => pdfMock));

vi.mock("html2canvas", () => ({ default: html2canvasMock }));
vi.mock("jspdf", () => ({ jsPDF: jsPDFMock }));

import { downloadUserGuidePdf } from "../client/src/lib/helpPdf";

describe("user guide PDF download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,guide");
    html2canvasMock.mockResolvedValue({ width: 800, height: 1200, toDataURL: () => "data:image/png;base64,guide" });
  });

  it("ينشئ PDF مخصصاً للدور وينظف العقدة المؤقتة", async () => {
    const before = document.querySelectorAll("article").length;
    await downloadUserGuidePdf("analyst");
    expect(jsPDFMock).toHaveBeenCalledWith(expect.objectContaining({ format: "a4", orientation: "portrait" }));
    expect(pdfMock.addImage).toHaveBeenCalled();
    expect(pdfMock.save).toHaveBeenCalledWith("دليل-مستخدم-المرصد-السياحي.pdf");
    expect(document.querySelectorAll("article")).toHaveLength(before);
  });
});
