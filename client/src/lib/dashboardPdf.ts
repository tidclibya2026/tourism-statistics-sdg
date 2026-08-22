import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export function getPdfImagePlacements(imageWidth: number, imageHeight: number, pageWidth: number, pageHeight: number) {
  const scaledHeight = imageHeight * pageWidth / imageWidth;
  const positions: number[] = [];
  let remaining = scaledHeight;
  while (remaining > 0) {
    positions.push(remaining - scaledHeight);
    remaining -= pageHeight;
  }
  return { scaledHeight, positions };
}

type CanvasLike = { width: number; height: number; toDataURL: (type: string) => string };
type PdfLike = {
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
  addImage: (image: string, format: string, x: number, y: number, width: number, height: number) => void;
  addPage: () => void;
  save: (fileName: string) => void;
};

export type DashboardPdfDependencies = {
  capture: (element: HTMLElement) => Promise<CanvasLike>;
  createPdf: () => PdfLike;
};

const defaultDependencies: DashboardPdfDependencies = {
  capture: (element) => html2canvas(element, { scale: 1.5, backgroundColor: "#f4f7f5", useCORS: true }),
  createPdf: () => new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" }),
};

export async function exportDashboardPdf(element: HTMLElement, fileName: string, dependencies: DashboardPdfDependencies = defaultDependencies) {
  const canvas = await dependencies.capture(element);
  const pdf = dependencies.createPdf();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const { scaledHeight, positions } = getPdfImagePlacements(canvas.width, canvas.height, pageWidth, pageHeight);
  const image = canvas.toDataURL("image/png");
  positions.forEach((position, index) => {
    if (index > 0) pdf.addPage();
    pdf.addImage(image, "PNG", 0, position, pageWidth, scaledHeight);
  });
  pdf.save(fileName);
}
