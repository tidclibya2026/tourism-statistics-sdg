import QueryStateError from "@/components/QueryStateError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { arabicNumber } from "@/lib/tourism";
import { trpc } from "@/lib/trpc";
import { importTemplateUrl } from "@/lib/importTemplate";
import { Download, Info, LineChart as LineChartIcon, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Forecast() {
  const indicators = trpc.indicators.list.useQuery();
  const [indicatorId, setIndicatorId] = useState("");
  const [horizon, setHorizon] = useState("5");
  const [method, setMethod] = useState<"historical_cagr" | "custom_rate">("historical_cagr");
  const [customRate, setCustomRate] = useState("8");
  const queryInput = useMemo(() => ({
    indicatorId: Number(indicatorId),
    horizon: Number(horizon),
    method,
    customRate: method === "custom_rate" ? Number(customRate) / 100 : undefined,
  }), [indicatorId, horizon, method, customRate]);
  const forecast = trpc.forecast.calculate.useQuery(queryInput, { enabled: Number.isInteger(queryInput.indicatorId) && queryInput.indicatorId > 0 });
  const selected = (indicators.data ?? []).find((indicator) => indicator.id === Number(indicatorId));
  const chartData = useMemo(() => {
    if (!forecast.data) return [];
    return [
      ...forecast.data.history.map((point) => ({ year: point.year, actual: point.value, forecast: null })),
      ...forecast.data.forecast.map((point) => ({ year: point.year, actual: null, forecast: point.value })),
    ];
  }, [forecast.data]);

  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-[1.7rem] bg-[#0d5d59] px-6 py-7 text-white shadow-[0_18px_38px_rgba(15,92,88,.18)] md:px-8">
      <div className="absolute -left-10 -top-12 h-40 w-40 rounded-full border-[22px] border-[#c58a3f]/20" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-[.16em] text-[#f5d89f]"><Sparkles className="h-4 w-4" />تنبؤ قائم على البيانات المعتمدة</div><h1 className="text-2xl font-bold md:text-3xl">التنبؤ بالمؤشرات السياحية</h1><p className="mt-2 max-w-2xl leading-7 text-teal-50/85">توقع سنوي شفاف يستند إلى القياسات السنوية المعتمدة في المنصة. لا يُعد بديلاً عن المراجعة الإحصائية أو القرار المؤسسي.</p></div>
        <a href={importTemplateUrl} download className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white/12 px-4 text-sm font-bold text-white ring-1 ring-white/25 transition hover:bg-white/20"><Download className="h-4 w-4" />تنزيل قالب Excel</a>
      </div>
    </section>

    <section className="section-card p-5 md:p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e6f1ee] text-[#0f5c58]"><LineChartIcon className="h-5 w-5" /></span><div><h2 className="font-bold text-[#173f3d]">إعداد التنبؤ</h2><p className="mt-1 text-xs text-slate-500">يتطلب التنبؤ قياسين سنويين معتمدين على الأقل للمؤشر المختار.</p></div></div>
      {indicators.isError && <div className="mt-4"><QueryStateError message="تعذر تحميل قائمة المؤشرات." onRetry={() => indicators.refetch()} /></div>}
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="md:col-span-2"><Label className="field-label">المؤشر</Label><Select value={indicatorId} onValueChange={setIndicatorId}><SelectTrigger><SelectValue placeholder="اختر مؤشراً له قياسات سنوية معتمدة" /></SelectTrigger><SelectContent>{(indicators.data ?? []).map((indicator) => <SelectItem value={String(indicator.id)} key={indicator.id}>{indicator.name} · {indicator.unit}</SelectItem>)}</SelectContent></Select></div>
        <div><Label className="field-label">سنوات التنبؤ</Label><Select value={horizon} onValueChange={setHorizon}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="3">3 سنوات</SelectItem><SelectItem value="5">5 سنوات</SelectItem><SelectItem value="10">10 سنوات</SelectItem><SelectItem value="15">15 سنة</SelectItem></SelectContent></Select></div>
        <div><Label className="field-label">منهجية النمو</Label><Select value={method} onValueChange={(value: "historical_cagr" | "custom_rate") => setMethod(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="historical_cagr">المعدل التاريخي المركب</SelectItem><SelectItem value="custom_rate">معدل مخصص</SelectItem></SelectContent></Select></div>
      </div>
      {method === "custom_rate" && <div className="mt-4 max-w-xs"><Label className="field-label">معدل النمو السنوي المخصص (%)</Label><Input type="number" min="-99" max="200" step="0.1" value={customRate} onChange={(event) => setCustomRate(event.target.value)} /></div>}
    </section>

    {forecast.isError && <QueryStateError message={forecast.error.message || "تعذر حساب التنبؤ للمؤشر المختار."} onRetry={() => forecast.refetch()} />}
    {!indicatorId ? <section className="rounded-2xl border border-dashed border-[#cfe0da] bg-[#f8fbf9] p-10 text-center text-sm leading-7 text-slate-500">اختر مؤشراً من القائمة لعرض التاريخ والتوقعات.</section> : forecast.isLoading ? <section className="section-card grid min-h-80 place-items-center p-8 text-sm text-slate-500">جارٍ حساب التنبؤ…</section> : forecast.data && <>
      <section className="grid gap-4 md:grid-cols-4"><Metric label="سنة الأساس" value={arabicNumber.format(forecast.data.baseYear)} /><Metric label="قيمة الأساس" value={`${arabicNumber.format(forecast.data.baseValue)} ${selected?.unit ?? ""}`} /><Metric label="معدل النمو المطبق" value={`${(forecast.data.appliedRate * 100).toLocaleString("ar-LY", { maximumFractionDigits: 2 })}%`} /><Metric label="نضج السلسلة التاريخية" value={forecast.data.dataQuality} /></section>
      <section className="section-card p-5 md:p-6"><div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"><div><h2 className="font-bold text-[#173f3d]">المسار التاريخي والتوقعات</h2><p className="mt-1 text-xs text-slate-500">المؤشر: {selected?.name ?? forecast.data.indicator?.name} · القيم المتصلة هي إسقاطات حسابية وليست قياسات فعلية.</p></div><span className="rounded-full bg-[#eef7f4] px-3 py-1 text-xs font-bold text-[#0f5c58]">{forecast.data.method === "historical_cagr" ? "نمو مركب تاريخي" : "نمو بمعدل مخصص"}</span></div><div className="mt-5 h-[360px]" dir="ltr"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 10, right: 22, left: -15, bottom: 0 }}><CartesianGrid stroke="#e4ece9" strokeDasharray="3 3" /><XAxis dataKey="year" tick={{ fontSize: 12, fill: "#64748b" }} /><YAxis tick={{ fontSize: 12, fill: "#64748b" }} /><Tooltip formatter={(value) => arabicNumber.format(Number(value))} /><Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} /><Line type="monotone" name="فعلي معتمد" dataKey="actual" stroke="#0f5c58" strokeWidth={3} dot={{ r: 4 }} connectNulls /><Line type="monotone" name="توقع" dataKey="forecast" stroke="#c58a3f" strokeDasharray="7 5" strokeWidth={3} dot={{ r: 4 }} connectNulls /></LineChart></ResponsiveContainer></div></section>
      <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><div className="table-shell"><div className="border-b border-[#e8efec] p-4"><h2 className="font-bold text-[#173f3d]">التوقعات السنوية</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[440px] text-right text-sm"><thead className="bg-[#f6f9f7] text-xs text-slate-500"><tr><th className="px-5 py-3">السنة</th><th className="px-4 py-3">القيمة المتوقعة</th><th className="px-4 py-3">الوحدة</th></tr></thead><tbody className="divide-y divide-[#edf2ef]">{forecast.data.forecast.map((point) => <tr key={point.year}><td className="px-5 py-3.5 font-semibold text-[#244844]">{arabicNumber.format(point.year)}</td><td className="px-4 py-3.5 font-bold text-[#b47730]">{arabicNumber.format(point.value)}</td><td className="px-4 py-3.5 text-slate-600">{selected?.unit ?? "—"}</td></tr>)}</tbody></table></div></div><div className="rounded-2xl border border-[#d7e5df] bg-[#f7fbf9] p-5"><div className="flex items-center gap-2 text-[#0f5c58]"><Info className="h-5 w-5" /><h2 className="font-bold">المنهجية والافتراضات</h2></div><p className="mt-4 text-sm leading-7 text-slate-600">يُحتسب معدل النمو التاريخي المركب من أول وآخر قياس سنوي معتمد. عند اختيار معدل مخصص، يحل المعدل المدخل محل المعدل التاريخي.</p><dl className="mt-4 space-y-3 border-t border-[#dbe9e3] pt-4 text-sm"><div className="flex justify-between gap-4"><dt className="text-slate-500">المعدل التاريخي</dt><dd className="font-bold text-[#244844]">{(forecast.data.historicalCagr * 100).toLocaleString("ar-LY", { maximumFractionDigits: 2 })}%</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">عدد السنوات التاريخية</dt><dd className="font-bold text-[#244844]">{arabicNumber.format(forecast.data.history.length)}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">حالة البيانات المستخدمة</dt><dd className="font-bold text-[#244844]">قياسات سنوية معتمدة فقط</dd></div></dl></div></section>
    </>}
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="section-card p-4"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-xl font-bold text-[#173f3d]">{value}</p></div>; }
