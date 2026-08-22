import html2canvas from "html2canvas";
import { exportDashboardPdf } from "./dashboardPdf";

type CanvasLike = { toDataURL: (type: string) => string };

export type SpatialExportDependencies = {
  capture: (element: HTMLElement) => Promise<CanvasLike>;
  download: (dataUrl: string, fileName: string) => void;
  exportPdf: (element: HTMLElement, fileName: string) => Promise<void>;
};

function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  link.click();
}

const defaultDependencies: SpatialExportDependencies = {
  capture: (element) => html2canvas(element, { scale: 1.75, backgroundColor: "#f4f7f5", useCORS: true }),
  download: downloadDataUrl,
  exportPdf: (element, fileName) => exportDashboardPdf(element, fileName),
};

export async function exportSpatialPng(element: HTMLElement, fileName: string, dependencies: SpatialExportDependencies = defaultDependencies) {
  const canvas = await dependencies.capture(element);
  dependencies.download(canvas.toDataURL("image/png"), fileName);
}

export async function exportSpatialPdf(element: HTMLElement, fileName: string, dependencies: SpatialExportDependencies = defaultDependencies) {
  await dependencies.exportPdf(element, fileName);
}
