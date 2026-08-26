import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { helpSections, roleHelpLabels, type HelpRole } from "./helpContent";

function createGuideElement(role: HelpRole) {
  const root = document.createElement("article");
  root.dir = "rtl";
  root.style.cssText = "position:fixed;left:-10000px;top:0;width:760px;padding:46px;background:#ffffff;color:#173f3d;font-family:Arial,sans-serif;line-height:1.8;text-align:right;box-sizing:border-box;";
  root.innerHTML = `<header style="border-bottom:3px solid #0f5c58;padding-bottom:16px;margin-bottom:20px"><p style="margin:0;color:#a76d25;font-size:13px;font-weight:700">مركز المعلومات والتوثيق السياحي</p><h1 style="margin:8px 0 0;font-size:27px;color:#123c3a">دليل المستخدم التشغيلي</h1><p style="margin:6px 0 0;color:#526b66">نسخة مخصصة لدور: ${roleHelpLabels[role]}</p></header>`;
  root.insertAdjacentHTML("beforeend", "<p style='font-size:14px;background:#f0f8f5;padding:12px;border-radius:10px'>يعرض هذا الدليل المسار الآمن من إدخال البيانات إلى المراجعة المستقلة والاعتماد. لا تظهر البيانات للعامة إلا بعد اعتمادها.</p>");
  helpSections.filter((section) => section.roles.includes(role)).forEach((section, index) => {
    const steps = section.steps.map((step) => `<li style="margin:4px 0">${step}</li>`).join("");
    root.insertAdjacentHTML("beforeend", `<section style="margin-top:20px;break-inside:avoid"><h2 style="font-size:19px;color:#0f5c58;margin:0 0 7px">${index + 1}. ${section.title}</h2><p style="margin:0;color:#405c57;font-size:14px">${section.summary}</p><ol style="margin:9px 0 0;padding-right:23px;font-size:13px;color:#283f3a">${steps}</ol></section>`);
  });
  root.insertAdjacentHTML("beforeend", "<footer style='border-top:1px solid #dce8e4;margin-top:28px;padding-top:12px;color:#627973;font-size:11px'>المنصة لا تعتمد البيانات تلقائياً، ولا تحول التوقعات إلى قياسات فعلية، ولا تفعل النشر الخارجي بلا موافقة وعقد تكامل.</footer>");
  return root;
}

export async function downloadUserGuidePdf(role: HelpRole) {
  const root = createGuideElement(role);
  document.body.appendChild(root);
  try {
    await document.fonts?.ready;
    const canvas = await html2canvas(root, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 28;
    const drawableWidth = pageWidth - margin * 2;
    const drawableHeight = pageHeight - margin * 2;
    const sourcePageHeight = Math.max(1, Math.floor((drawableHeight / drawableWidth) * canvas.width));
    for (let y = 0, page = 0; y < canvas.height; y += sourcePageHeight, page += 1) {
      const sourceHeight = Math.min(sourcePageHeight, canvas.height - y);
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = sourceHeight;
      slice.getContext("2d")?.drawImage(canvas, 0, y, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
      if (page > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL("image/png"), "PNG", margin, margin, drawableWidth, (sourceHeight / canvas.width) * drawableWidth);
    }
    pdf.save("دليل-مستخدم-المرصد-السياحي.pdf");
  } finally {
    root.remove();
  }
}
