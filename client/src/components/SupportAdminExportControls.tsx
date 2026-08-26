import { Button } from "@/components/ui/button";
import { downloadSupportExcel, downloadSupportPdf } from "@/lib/supportAdminExport";
import { FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function SupportAdminExportControls({ requests, ratings }: { requests: any[]; ratings: any[] }) {
  const [loadingPdf, setLoadingPdf] = useState(false);
  return <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dce8e4] bg-white p-4 shadow-sm"><div><h2 className="font-bold text-[#173f3d]">تصدير تقرير الدعم</h2><p className="mt-1 text-sm text-slate-500">يتضمن التصدير الطلبات والتقييمات المفلترة وبيانات الرسوم. يلتقط PDF الرسوم المعروضة حالياً.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" className="border-[#b9d7cf] text-[#0f766e]" onClick={() => { downloadSupportExcel(requests, ratings); toast.success("تم تجهيز ملف Excel للتنزيل."); }}><FileSpreadsheet className="ml-1.5 h-4 w-4" />Excel</Button><Button disabled={loadingPdf} className="bg-[#0f766e] hover:bg-[#0a5f58]" onClick={async () => { try { setLoadingPdf(true); await downloadSupportPdf(); toast.success("تم تجهيز تقرير PDF للتنزيل."); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تصدير PDF."); } finally { setLoadingPdf(false); } }}><FileText className="ml-1.5 h-4 w-4" />{loadingPdf ? "يُجهز PDF…" : "PDF"}</Button></div></section>;
}
