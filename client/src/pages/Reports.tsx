import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import QueryStateError from "@/components/QueryStateError";
import { arabicNumber, asNumber, formatYear, periodLabel } from "@/lib/tourism";
import { trpc } from "@/lib/trpc";
import { openPrintablePdf } from "@/lib/dashboardPdf";
import { toExcelReportRows } from "@/lib/reportExport";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function Reports() {
  const [yearFrom, setYearFrom] = useState("2020");
  const [yearTo, setYearTo] = useState(String(new Date().getFullYear()));
  const reportRef = useRef<HTMLDivElement>(null);
  const query = trpc.observations.list.useQuery({
    yearFrom: Number(yearFrom),
    yearTo: Number(yearTo),
    status: "approved",
  });
  const data = query.data ?? [];
  const annualTrend = useMemo(() => {
    const years = Array.from(new Set(data.filter((item) => item.observation.period === "annual").map((item) => item.observation.year))).sort();
    return years.map((year) => ({ year, measurements: data.filter((item) => item.observation.year === year && item.observation.period === "annual").length }));
  }, [data]);

  function exportExcel() {
    if (!data.length) {
      toast.error("لا توجد بيانات معتمدة لتصديرها.");
      return;
    }
    const rows = toExcelReportRows(data);
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [{ wch: 16 }, { wch: 36 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 15 }, { wch: 18 }, { wch: 30 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "المؤشرات");
    XLSX.writeFile(workbook, `تقرير-المؤشرات-${yearFrom}-${yearTo}.xlsx`);
  }

  async function exportPdf() {
    if (!reportRef.current || !data.length) {
      toast.error("لا توجد بيانات معتمدة لتصديرها.");
      return;
    }
    try {
      openPrintablePdf(reportRef.current, `تقرير-المؤشرات-${yearFrom}-${yearTo}.pdf`);
    } catch (error) {
      console.error("Report PDF export failed", error);
      toast.error("تعذر إنشاء ملف PDF في الوقت الحالي.");
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="page-title">التقارير والتصدير</h1>
        <p className="page-subtitle">تصفية القياسات المعتمدة حسب الفترة الزمنية وتصديرها حصراً بتنسيقي PDF وExcel.</p>
      </section>

      {query.isError && <QueryStateError message="تعذر تحميل بيانات التقرير." onRetry={() => query.refetch()} />}

      <section className="section-card flex flex-col gap-4 p-5 md:flex-row md:items-end md:justify-between">
        <div className="grid grid-cols-2 gap-3">
          <label><span className="field-label">من سنة</span><Input type="number" value={yearFrom} onChange={(event) => setYearFrom(event.target.value)} /></label>
          <label><span className="field-label">إلى سنة</span><Input type="number" value={yearTo} onChange={(event) => setYearTo(event.target.value)} /></label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportExcel}><FileSpreadsheet className="ml-1.5 h-4 w-4 text-emerald-700" />تصدير Excel</Button>
          <Button className="bg-[#0f5c58] hover:bg-[#0a4845]" onClick={exportPdf}><FileText className="ml-1.5 h-4 w-4" />تصدير PDF</Button>
        </div>
      </section>

      <div ref={reportRef} className="table-shell bg-white">
        <div className="border-b border-[#e8efec] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold tracking-[.16em] text-[#b47730]">المرصد الوطني للسياحة</p>
              <h2 className="mt-1 font-bold text-[#173f3d]">تقرير القياسات المعتمدة</h2>
              <p className="mt-1 text-xs text-slate-500">من {formatYear(yearFrom)} إلى {formatYear(yearTo)} · {data.length} قياس</p>
            </div>
            <Printer className="h-5 w-5 text-[#0f5c58]" />
          </div>
        </div>

        {annualTrend.length > 0 && (
          <div className="border-b border-[#e8efec] p-5" dir="ltr">
            <p className="mb-3 text-right text-sm font-bold text-[#173f3d]" dir="rtl">الاتجاه السنوي للقياسات المعتمدة</p>
            <div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={annualTrend} margin={{ top: 5, right: 16, left: -22, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#e4ece9" /><XAxis dataKey="year" tick={{ fontSize: 12, fill: "#64748b" }} /><YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} /><Tooltip formatter={(value) => [arabicNumber.format(Number(value)), "قياسات"]} /><Bar dataKey="measurements" fill="#0f5c58" radius={[7, 7, 0, 0]} /></BarChart></ResponsiveContainer></div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-right text-sm">
            <thead className="bg-[#f6f9f7] text-xs text-slate-500"><tr><th className="px-5 py-3">المؤشر</th><th className="px-4 py-3">التصنيف</th><th className="px-4 py-3">السنة والفترة</th><th className="px-4 py-3">القيمة</th><th className="px-4 py-3">المستهدف</th><th className="px-4 py-3">المصدر</th></tr></thead>
            <tbody className="divide-y divide-[#edf2ef]">
              {query.isLoading ? <tr><td colSpan={6} className="p-8 text-center text-slate-500">جارٍ إنشاء التقرير…</td></tr> : data.length ? data.map((item) => <tr key={item.observation.id}><td className="px-5 py-3.5"><p className="font-semibold text-[#244844]">{item.indicator.name}</p><p className="mt-0.5 text-xs text-slate-500" dir="ltr">{item.indicator.code}</p></td><td className="px-4 py-3.5 text-slate-600">{item.indicator.axis} · {item.indicator.framework}{item.indicator.sdgReference ? ` · ${item.indicator.sdgReference}` : ""}</td><td className="px-4 py-3.5 text-slate-600">{formatYear(item.observation.year)} · {periodLabel(item.observation.period, item.observation.quarter)}</td><td className="px-4 py-3.5 font-bold text-[#0f5c58]">{arabicNumber.format(asNumber(item.observation.value))} {item.indicator.unit}</td><td className="px-4 py-3.5 text-slate-600">{item.observation.targetValue ? arabicNumber.format(asNumber(item.observation.targetValue)) : "—"}</td><td className="px-4 py-3.5 text-slate-600">{item.observation.source || "—"}</td></tr>) : <tr><td colSpan={6} className="p-10 text-center text-slate-500">لا توجد قياسات معتمدة ضمن الفترة المختارة.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
