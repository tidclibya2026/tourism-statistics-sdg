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

export function getPdfCaptureOptions(backgroundColor = "#f4f7f5") {
  return { scale: 1.5, backgroundColor, useCORS: true, foreignObjectRendering: true, logging: false };
}

const defaultDependencies: DashboardPdfDependencies = {
  capture: (element) => html2canvas(element, getPdfCaptureOptions()),
  createPdf: () => new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" }),
};

export function getPrintablePdfTitle(fileName: string) {
  return fileName.replace(/\.pdf$/i, "");
}

type PrintWindowCleanupTarget = Pick<Window, "addEventListener" | "close" | "focus"> & { closed: boolean };
type SourceWindowTarget = Pick<Window, "focus" | "setTimeout">;

export function returnToApplicationAfterPrint(printWindow: PrintWindowCleanupTarget, sourceWindow: SourceWindowTarget = window) {
  printWindow.addEventListener("afterprint", () => {
    sourceWindow.setTimeout(() => {
      if (!printWindow.closed) printWindow.close();
      sourceWindow.focus();
    }, 0);
  }, { once: true });
}

export function openPrintablePdf(element: HTMLElement, fileName: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) throw new Error("تعذر فتح نافذة حفظ PDF. تحقق من السماح بالنوافذ المنبثقة لهذا الرابط الداخلي.");

  printWindow.opener = null;
  printWindow.document.title = getPrintablePdfTitle(fileName);
  document.querySelectorAll('link[rel="stylesheet"], style').forEach((style) => printWindow.document.head.append(style.cloneNode(true)));

  const printStyle = printWindow.document.createElement("style");
  printStyle.textContent = `
    @page { size: A4 landscape; margin: 10mm; }
    html, body { background: #fff !important; color: #173f3d !important; direction: rtl; }
    body { margin: 0; padding: 0; }
    .pdf-print-root { overflow: visible !important; box-shadow: none !important; }
    .pdf-print-root * { animation: none !important; transition: none !important; }
    .pdf-print-root .overflow-x-auto, .pdf-print-root .overflow-hidden { overflow: visible !important; }
    .pdf-print-root table { width: 100% !important; min-width: 0 !important; font-size: 9pt; }
    .pdf-print-root tr, .pdf-print-root .recharts-wrapper { break-inside: avoid; page-break-inside: avoid; }
    @media print { .pdf-print-root { width: 100% !important; } }
  `;
  printWindow.document.head.append(printStyle);

  const root = printWindow.document.createElement("main");
  root.className = "pdf-print-root";
  root.append(element.cloneNode(true));
  printWindow.document.body.append(root);

  returnToApplicationAfterPrint(printWindow);

  const print = () => {
    printWindow.focus();
    printWindow.print();
  };
  if (printWindow.document.fonts?.ready) printWindow.document.fonts.ready.then(() => window.setTimeout(print, 150));
  else window.setTimeout(print, 150);
}

export async function exportDashboardPdf(element: HTMLElement, fileName: string, dependencies: DashboardPdfDependencies = defaultDependencies) {
  if (dependencies === defaultDependencies) {
    openPrintablePdf(element, fileName);
    return;
  }
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

export async function exportElementPng(element: HTMLElement, fileName: string, capture = (target: HTMLElement) => html2canvas(target, { ...getPdfCaptureOptions("#f8fbfa"), scale: 3 })) {
  const canvas = await capture(element);
  const url = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
}
