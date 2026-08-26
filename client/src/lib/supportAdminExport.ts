import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { buildSupportInsights } from "./supportInsights";
import type { SupportInsightRequest } from "./supportInsights";

type RequestRow = SupportInsightRequest & { id: number; roleSnapshot: string; status: string; createdAt: Date; submitterName: string | null; replies?: { message: string }[] };
type RatingRow = { sectionId: string; role: string; helpful: number; notHelpful: number };

export function downloadSupportExcel(requests: RequestRow[], ratings: RatingRow[]) {
  const workbook = XLSX.utils.book_new(); const insights = buildSupportInsights(requests);
  const requestRows = requests.map((item) => ({ "رقم الطلب": item.id, "الدور": item.roleSnapshot, "الحالة": item.status, "النوع": item.category, "العنوان": item.subject, "التفاصيل": item.message, "المرسل": item.submitterName ?? "مستخدم المنصة", "عدد الردود": item.replies?.length ?? 0, "تاريخ الإرسال": new Date(item.createdAt).toLocaleString("ar-LY") }));
  const ratingRows = ratings.map((item) => ({ "قسم الدليل": item.sectionId, "الدور": item.role, "مفيد": item.helpful, "غير مفيد": item.notHelpful }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(requestRows), "طلبات الدعم");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(ratingRows), "تقييمات المساعدة");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(insights.categoryCounts.map((item) => ({ "نوع الطلب": item.name, "العدد": item.count }))), "بيانات الرسم - الأنواع");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(insights.commonTerms.map((item) => ({ "الكلمة المتكررة": item.name, "عدد الظهور": item.count }))), "بيانات الرسم - الكلمات");
  XLSX.writeFile(workbook, `تقرير-إدارة-الدعم-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function downloadSupportPdf() {
  const report = document.getElementById("support-admin-report");
  if (!report) throw new Error("تعذر العثور على محتوى التقرير.");
  const canvas = await html2canvas(report, { scale: 2, backgroundColor: "#f4f7f5", useCORS: true });
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" }); const width = 190; const height = (canvas.height * width) / canvas.width;
  let remaining = height; let position = 10; const image = canvas.toDataURL("image/png");
  while (remaining > 0) { pdf.addImage(image, "PNG", 10, position, width, height); remaining -= 277; if (remaining > 0) { pdf.addPage(); position -= 277; } }
  pdf.save(`تقرير-إدارة-الدعم-${new Date().toISOString().slice(0, 10)}.pdf`);
}
