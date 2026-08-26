export const PDF_CAPTURE_ROOT_ATTRIBUTE = "data-pdf-capture";
const PDF_CAPTURE_CLASS = "pdf-render-root";

export function preparePdfCaptureDocument(clonedDocument: Document) {
  const report = clonedDocument.querySelector<HTMLElement>(`[${PDF_CAPTURE_ROOT_ATTRIBUTE}]`);
  if (!report) return;

  report.classList.add(PDF_CAPTURE_CLASS);
  const style = clonedDocument.createElement("style");
  style.textContent = `
    .${PDF_CAPTURE_CLASS}, .${PDF_CAPTURE_CLASS} * {
      color-scheme: light !important;
      --background: #ffffff !important;
      --color-background: #ffffff !important;
      --foreground: #173f3d !important;
      --color-foreground: #173f3d !important;
      --card: #ffffff !important;
      --color-card: #ffffff !important;
      --card-foreground: #173f3d !important;
      --color-card-foreground: #173f3d !important;
      --popover: #ffffff !important;
      --color-popover: #ffffff !important;
      --popover-foreground: #173f3d !important;
      --color-popover-foreground: #173f3d !important;
      --primary: #0f5c58 !important;
      --color-primary: #0f5c58 !important;
      --primary-foreground: #ffffff !important;
      --color-primary-foreground: #ffffff !important;
      --secondary: #eff7f4 !important;
      --color-secondary: #eff7f4 !important;
      --secondary-foreground: #173f3d !important;
      --color-secondary-foreground: #173f3d !important;
      --muted: #f6f9f7 !important;
      --color-muted: #f6f9f7 !important;
      --muted-foreground: #64748b !important;
      --color-muted-foreground: #64748b !important;
      --accent: #e8f3ef !important;
      --color-accent: #e8f3ef !important;
      --accent-foreground: #173f3d !important;
      --color-accent-foreground: #173f3d !important;
      --border: #dce8e4 !important;
      --color-border: #dce8e4 !important;
      --input: #dce8e4 !important;
      --color-input: #dce8e4 !important;
      --ring: #0f5c58 !important;
      --color-ring: #0f5c58 !important;
      outline-color: #0f5c58 !important;
      text-shadow: none !important;
      box-shadow: none !important;
    }
    .${PDF_CAPTURE_CLASS} { background: #ffffff !important; color: #173f3d !important; }
    .${PDF_CAPTURE_CLASS} .bg-background,
    .${PDF_CAPTURE_CLASS} .bg-card,
    .${PDF_CAPTURE_CLASS} .bg-white { background-color: #ffffff !important; }
    .${PDF_CAPTURE_CLASS} .border-border { border-color: #dce8e4 !important; }
  `;
  clonedDocument.head.append(style);
}
