import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import QueryStateError from "@/components/QueryStateError";
import { arabicNumber, asNumber, formatYear, periodLabel } from "@/lib/tourism";
import { trpc } from "@/lib/trpc";
import { openPrintablePdf } from "@/lib/dashboardPdf";
import { toExcelReportRows } from "@/lib/reportExport";
import { sha256Text } from "@/lib/reportSignature";
import { BarChart3, CheckCircle2, FileSpreadsheet, FileText, LineChart as LineChartIcon, LoaderCircle, LockKeyhole, MapPin, Printer, ShieldCheck, Sparkles } from "lucide-react";
import React, { useMemo, useRef, useState } from "react";
import { readUserDisplayPreferences, saveUserDisplayPreferences, type PreferredChart } from "@/lib/userPreferences";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type ChartMode = "bars" | "line";

export default function Reports() {
  const [yearFrom, setYearFrom] = useState("2020");
  const [yearTo, setYearTo] = useState(String(new Date().getFullYear()));
  const [chartMode, setChartMode] = useState<ChartMode>(() => readUserDisplayPreferences().chartType);
  const [areaId, setAreaId] = useState("all");
  const [exporting, setExporting] = useState<"excel" | "pdf" | "signed-pdf" | null>(null);
  const [reportSignature, setReportSignature] = useState<Awaited<ReturnType<typeof trpc.dashboard.signApprovedReport.useMutation>>["data"]>(undefined);
  const reportRef = useRef<HTMLDivElement>(null);
  const spatialQuery = trpc.spatial.overview.useQuery({});
  const query = trpc.observations.list.useQuery({
    yearFrom: Number(yearFrom),
    yearTo: Number(yearTo),
    status: "approved",
  });
  const nationalData = query.data ?? [];
  const reportLoading = query.isLoading || spatialQuery.isLoading;
  const narrative = trpc.dashboard.narrative.useMutation();
  const signReport = trpc.dashboard.signApprovedReport.useMutation();
  const capabilities = trpc.auth.administrativeCapabilities.useQuery(undefined, { enabled: true, retry: false, refetchOnWindowFocus: false });
  const areaOptions = useMemo(() => [...(spatialQuery.data?.regions ?? []), ...(spatialQuery.data?.cities ?? [])], [spatialQuery.data]);
  const data = useMemo(() => {
    if (areaId === "all") return nationalData;
    const selected = areaOptions.find((area) => String(area.id) === areaId);
    if (!selected || !spatialQuery.data) return [];
    return spatialQuery.data.observations
      .filter((item) => (selected.type === "region" ? item.areaId === selected.id || item.parentName === selected.name : item.areaId === selected.id))
      .filter((item) => item.year >= Number(yearFrom) && item.year <= Number(yearTo))
      .map((item) => {
        const indicator = spatialQuery.data?.indicators.find((candidate) => candidate.id === item.indicatorId);
        return {
          indicator: { code: item.indicatorCode, name: item.indicatorName, axis: indicator?.axis ?? "اقتصادي", framework: indicator?.framework ?? "SDG", sdgReference: indicator?.sdgReference ?? null, unit: item.unit },
          observation: { id: item.id, year: item.year, period: "annual" as const, quarter: "annual" as const, value: item.value, targetValue: null, source: item.source ?? item.areaName },
        };
      });
  }, [areaId, areaOptions, nationalData, spatialQuery.data, yearFrom, yearTo]);
  const annualTrend = useMemo(() => {
    const years = Array.from(new Set(data.filter((item) => item.observation.period === "annual").map((item) => item.observation.year))).sort();
    return years.map((year) => ({ year, measurements: data.filter((item) => item.observation.year === year && item.observation.period === "annual").length }));
  }, [data]);
  const selectedAreaName = areaOptions.find((area) => String(area.id) === areaId)?.name;
  const areaTrend = useMemo(() => {
    const observations = spatialQuery.data?.observations ?? [];
    const latestYear = observations.reduce((latest, item) => Math.max(latest, item.year), 0);
    const counts = new Map<string, number>();
    observations.filter((item) => item.year === latestYear).forEach((item) => counts.set(item.areaName, (counts.get(item.areaName) ?? 0) + 1));
    return Array.from(counts, ([areaName, measurements]) => ({ areaName, measurements })).sort((a, b) => b.measurements - a.measurements || a.areaName.localeCompare(b.areaName, "ar")).slice(0, 12);
  }, [spatialQuery.data]);
  function changeChartMode(next: PreferredChart) { setChartMode(next); const current = readUserDisplayPreferences(); saveUserDisplayPreferences({ ...current, chartType: next }); }
  function generateNarrative() { narrative.mutate({ year: Number(yearTo) }); }

  function exportExcel() {
    if (!data.length) {
      toast.error("لا توجد بيانات معتمدة لتصديرها.");
      return;
    }
    setExporting("excel");
    try {
      const rows = toExcelReportRows(data);
      const sheet = XLSX.utils.json_to_sheet(rows);
      sheet["!cols"] = [{ wch: 16 }, { wch: 36 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 15 }, { wch: 18 }, { wch: 30 }];
      const summarySheet = XLSX.utils.json_to_sheet([
        { البند: "الفترة", القيمة: `${formatYear(yearFrom)}–${formatYear(yearTo)}` },
        { البند: "عدد القياسات المعتمدة", القيمة: data.length },
        { البند: "عدد السنوات ذات القياسات السنوية", القيمة: annualTrend.length },
        { البند: "نوع الرسم المختار", القيمة: chartMode === "bars" ? "أعمدة" : "خطي" },
        { البند: "تاريخ إنشاء الملف", القيمة: new Date().toLocaleDateString("ar-LY") },
      ]);
      summarySheet["!cols"] = [{ wch: 32 }, { wch: 28 }];
      const chartSheet = XLSX.utils.json_to_sheet(annualTrend.map((item) => ({ السنة: formatYear(item.year), "القياسات السنوية المعتمدة": item.measurements })));
      chartSheet["!cols"] = [{ wch: 14 }, { wch: 28 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, summarySheet, "ملخص التقرير");
      XLSX.utils.book_append_sheet(workbook, sheet, "القياسات المعتمدة");
      XLSX.utils.book_append_sheet(workbook, chartSheet, "بيانات الرسم");
      XLSX.writeFile(workbook, `تقرير-المؤشرات-${yearFrom}-${yearTo}.xlsx`);
      toast.success("تم تنزيل تقرير Excel مع الملخص وبيانات الرسم.");
    } catch (error) {
      console.error("Report Excel export failed", error);
      toast.error("تعذر إنشاء ملف Excel في الوقت الحالي.");
    } finally {
      setExporting(null);
    }
  }

  async function exportPdf() {
    if (!reportRef.current || !data.length) {
      toast.error("لا توجد بيانات معتمدة لتصديرها.");
      return;
    }
    setExporting("pdf");
    try {
      openPrintablePdf(reportRef.current, `تقرير-المؤشرات-${yearFrom}-${yearTo}.pdf`);
      toast.success("تم فتح نافذة حفظ PDF؛ ستعود إلى المنصة بعد الحفظ أو الإلغاء.");
    } catch (error) {
      console.error("Report PDF export failed", error);
      toast.error("تعذر إنشاء ملف PDF في الوقت الحالي.");
    } finally {
      setExporting(null);
    }
  }

  async function signAndExportPdf() {
    if (!reportRef.current || !data.length || !capabilities.data?.canApproveReleases) {
      toast.error("توقيع التقرير متاح لرئيس الإحصاء أو المسؤول المفوض باعتماد الإصدارات فقط.");
      return;
    }
    setExporting("signed-pdf");
    try {
      const contentHash = await sha256Text(reportRef.current.innerText);
      const signed = await signReport.mutateAsync({ reportType: "approved-observations", title: "تقرير القياسات المعتمدة", yearFrom: Number(yearFrom), yearTo: Number(yearTo), observationCount: data.length, contentHash });
      setReportSignature(signed);
      window.setTimeout(() => {
        if (reportRef.current) openPrintablePdf(reportRef.current, `تقرير-موقع-القياسات-${yearFrom}-${yearTo}.pdf`);
      }, 0);
      toast.success("تم توقيع التقرير رقمياً وفتح نافذة حفظ PDF.");
    } catch (error) {
      console.error("Signed report export failed", error);
      toast.error("تعذر توقيع التقرير. تحقق من صلاحية اعتماد الإصدارات.");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="page-title">التقارير والتصدير</h1>
        <p className="page-subtitle">تصفية القياسات المعتمدة حسب الفترة الزمنية وتصديرها بصيغتي PDF وExcel، مع رسم تفاعلي قابل للتبديل.</p>
      </section>

      {query.isError && <QueryStateError message="تعذر تحميل بيانات التقرير." onRetry={() => query.refetch()} />}

      <section className="section-card flex flex-col gap-4 p-5 md:flex-row md:items-end md:justify-between">
        <div className="grid gap-3 sm:grid-cols-3">
          <label><span className="field-label">من سنة</span><Input type="number" min="1900" max="2100" value={yearFrom} onChange={(event) => setYearFrom(event.target.value)} /></label>
          <label><span className="field-label">إلى سنة</span><Input type="number" min="1900" max="2100" value={yearTo} onChange={(event) => setYearTo(event.target.value)} /></label>
          <label><span className="field-label">المنطقة أو المدينة</span><Select value={areaId} onValueChange={setAreaId}><SelectTrigger><MapPin className="ml-2 h-4 w-4 text-[#0f766e]" /><SelectValue placeholder="كل المناطق" /></SelectTrigger><SelectContent><SelectItem value="all">كل القياسات الوطنية</SelectItem>{areaOptions.map((area) => <SelectItem key={area.id} value={String(area.id)}>{area.name} · {area.type === "region" ? "إقليم" : "مدينة"}</SelectItem>)}</SelectContent></Select></label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportExcel} disabled={Boolean(exporting) || reportLoading || !data.length} aria-busy={exporting === "excel"}>
            {exporting === "excel" ? <LoaderCircle className="ml-1.5 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="ml-1.5 h-4 w-4 text-emerald-700" />}تصدير Excel
          </Button>
          <Button className="bg-[#0f5c58] hover:bg-[#0a4845]" onClick={exportPdf} disabled={Boolean(exporting) || reportLoading || !data.length} aria-busy={exporting === "pdf"}>
            {exporting === "pdf" ? <LoaderCircle className="ml-1.5 h-4 w-4 animate-spin" /> : <FileText className="ml-1.5 h-4 w-4" />}تصدير PDF
          </Button>
          {capabilities.data?.canApproveReleases && <Button variant="outline" onClick={signAndExportPdf} disabled={Boolean(exporting) || reportLoading || !data.length} aria-busy={exporting === "signed-pdf"} className="border-[#b47730] text-[#8b5d24]">
            {exporting === "signed-pdf" ? <LoaderCircle className="ml-1.5 h-4 w-4 animate-spin" /> : <ShieldCheck className="ml-1.5 h-4 w-4" />}توقيع وتصدير PDF
          </Button>}
          <Button variant="outline" onClick={generateNarrative} disabled={reportLoading || narrative.isPending || !data.length} aria-busy={narrative.isPending}>
            {narrative.isPending ? <LoaderCircle className="ml-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="ml-1.5 h-4 w-4 text-amber-600" />}تحليل ذكي
          </Button>
        </div>
      </section>

      {narrative.data?.text && <section className="section-card border-amber-200 bg-amber-50/60 p-5" aria-live="polite"><div className="flex items-start gap-3"><Sparkles className="mt-1 h-5 w-5 shrink-0 text-amber-700" /><div><h2 className="font-bold text-[#173f3d]">أهم الاستنتاجات قبل التصدير</h2><div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{narrative.data.text}</div><p className="mt-3 text-xs text-slate-500">هذا الملخص مساعد تحليلي مبني على القياسات المعتمدة ولا يستبدل مراجعة قسم الإحصاء.</p></div></div></section>}

      <div ref={reportRef} className="table-shell bg-white report-surface">
        <div className="border-b border-[#e8efec] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold tracking-[.16em] text-[#b47730]">المرصد الوطني للسياحة</p>
              <h2 className="mt-1 font-bold text-[#173f3d]">تقرير القياسات المعتمدة</h2>
              <p className="mt-1 text-xs text-slate-500">من {formatYear(yearFrom)} إلى {formatYear(yearTo)} · {arabicNumber.format(data.length)} قياس{selectedAreaName ? ` · ${selectedAreaName}` : ""}</p>
              {reportSignature && <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#e8efec] pt-3 text-xs text-[#166534]" data-testid="report-digital-signature"><CheckCircle2 className="h-4 w-4" /><span>معتمد وموقّع رقمياً بواسطة {reportSignature.signerName}</span><span className="text-slate-500">{new Date(reportSignature.signedAt).toLocaleString("ar-LY")} · {reportSignature.algorithm} · بصمة {reportSignature.contentHash?.slice(0, 12)}</span></div>}
            </div>
            <div className="flex items-center gap-2 text-[#0f5c58]" aria-label="نوع الرسم التفاعلي">
              <Printer className="h-5 w-5" />
              <span className="text-xs font-semibold">الرسم:</span>
              <Button type="button" size="sm" variant={chartMode === "bars" ? "default" : "outline"} className={chartMode === "bars" ? "bg-[#0f5c58] hover:bg-[#0a4845]" : ""} onClick={() => changeChartMode("bars")} aria-pressed={chartMode === "bars"}><BarChart3 className="ml-1 h-4 w-4" />أعمدة</Button>
              <Button type="button" size="sm" variant={chartMode === "line" ? "default" : "outline"} className={chartMode === "line" ? "bg-[#0f5c58] hover:bg-[#0a4845]" : ""} onClick={() => changeChartMode("line")} aria-pressed={chartMode === "line"}><LineChartIcon className="ml-1 h-4 w-4" />خطي</Button>
            </div>
          </div>
        </div>

        {reportLoading && <div className="rounded-xl border border-dashed border-[#dce8e4] p-5 text-center text-sm text-slate-500" aria-live="polite">جارٍ تحميل بيانات الرسم…</div>}
        {!reportLoading && areaTrend.length > 0 && areaId === "all" && <div className="border-b border-[#e8efec] p-5" dir="ltr"><p className="mb-3 text-right text-sm font-bold text-[#173f3d]" dir="rtl">تفاصيل المناطق — انقر على العمود للتصفية</p><div className="chart-stage h-56" role="img" aria-label="رسم تفاعلي للقياسات المعتمدة حسب المنطقة"><ResponsiveContainer width="100%" height="100%"><BarChart data={areaTrend} margin={{ top: 5, right: 16, left: -22, bottom: 0 }} onClick={(event) => { const name = event?.activePayload?.[0]?.payload?.areaName; const area = areaOptions.find((candidate) => candidate.name === name); if (area) setAreaId(String(area.id)); }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="areaName" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval={0} angle={-18} textAnchor="end" height={50} /><YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} /><Tooltip formatter={(value) => [arabicNumber.format(Number(value)), "قياسات"]} /><Bar dataKey="measurements" name="القياسات المعتمدة" fill="var(--chart-2)" radius={[7, 7, 0, 0]} cursor="pointer" /></BarChart></ResponsiveContainer></div></div>}
        {!reportLoading && annualTrend.length > 0 && (
          <div className="border-b border-[#e8efec] p-5" dir="ltr">
            <p className="mb-3 text-right text-sm font-bold text-[#173f3d]" dir="rtl">الاتجاه السنوي للقياسات المعتمدة</p>
            <div className={`chart-stage h-56 ${query.isLoading || spatialQuery.isLoading ? "is-loading" : ""}`} role="img" aria-label="رسم تفاعلي لعدد القياسات السنوية المعتمدة حسب السنة">
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === "bars" ? (
                  <BarChart data={annualTrend} margin={{ top: 5, right: 16, left: -22, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="year" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} /><YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} /><Tooltip formatter={(value) => [arabicNumber.format(Number(value)), "قياسات"]} /><Bar dataKey="measurements" name="القياسات المعتمدة" fill="var(--chart-1)" radius={[7, 7, 0, 0]} /></BarChart>
                ) : (
                  <LineChart data={annualTrend} margin={{ top: 5, right: 16, left: -22, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="year" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} /><YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} /><Tooltip formatter={(value) => [arabicNumber.format(Number(value)), "قياسات"]} /><Line type="monotone" dataKey="measurements" name="القياسات المعتمدة" stroke="var(--chart-1)" strokeWidth={3} dot={{ r: 4, fill: "var(--chart-1)" }} activeDot={{ r: 6 }} /></LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-right text-sm">
            <caption className="sr-only">القياسات السياحية المعتمدة ضمن الفترة المختارة</caption>
            <thead className="bg-[#f6f9f7] text-xs text-slate-500"><tr><th className="px-5 py-3">المؤشر</th><th className="px-4 py-3">التصنيف</th><th className="px-4 py-3">السنة والفترة</th><th className="px-4 py-3">القيمة</th><th className="px-4 py-3">المستهدف</th><th className="px-4 py-3">المصدر</th></tr></thead>
            <tbody className="divide-y divide-[#edf2ef]">
              {query.isLoading ? <tr><td colSpan={6} className="p-8 text-center text-slate-500" aria-live="polite">جارٍ إنشاء التقرير…</td></tr> : data.length ? data.map((item) => <tr key={item.observation.id}><td className="px-5 py-3.5"><p className="font-semibold text-[#244844]">{item.indicator.name}</p><p className="mt-0.5 text-xs text-slate-500" dir="ltr">{item.indicator.code}</p></td><td className="px-4 py-3.5 text-slate-600">{item.indicator.axis} · {item.indicator.framework}{item.indicator.sdgReference ? ` · ${item.indicator.sdgReference}` : ""}</td><td className="px-4 py-3.5 text-slate-600">{formatYear(item.observation.year)} · {periodLabel(item.observation.period, item.observation.quarter)}</td><td className="px-4 py-3.5 font-bold text-[#0f5c58]">{arabicNumber.format(asNumber(item.observation.value))} {item.indicator.unit}</td><td className="px-4 py-3.5 text-slate-600">{item.observation.targetValue ? arabicNumber.format(asNumber(item.observation.targetValue)) : "—"}</td><td className="px-4 py-3.5 text-slate-600">{item.observation.source || "—"}</td></tr>) : <tr><td colSpan={6} className="p-10 text-center text-slate-500">لا توجد قياسات معتمدة ضمن الفترة المختارة.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
