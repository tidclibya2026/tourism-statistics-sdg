import { useAuth } from "@/_core/hooks/useAuth";
import QueryStateError from "@/components/QueryStateError";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { arabicNumber, asNumber, formatYear, observationStatusMeta, periodLabel } from "@/lib/tourism";
import { trpc } from "@/lib/trpc";
import { getIndicatorProfileEntries, type IndicatorProfileSource } from "@/lib/indicatorProfile";
import { createObservationPayload } from "@/lib/observationPayload";
import { buildDataEntryChartSeries } from "@/lib/dataEntryChart";
import { getUnitRule, validateUnitValue } from "@shared/unitValidation";
import { ChartNoAxesCombined, Database, Info, Save, Tag } from "lucide-react";
import React, { useMemo, useState } from "react";
import { Brush, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

export default function DataEntry() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const canWrite = user?.role === "admin" || user?.role === "analyst";
  const indicators = trpc.indicators.list.useQuery();
  const observations = trpc.observations.list.useQuery();
  const [form, setForm] = useState({ indicatorId: "", year: String(new Date().getFullYear()), period: "annual" as "annual" | "quarterly", quarter: "annual", value: "", targetValue: "", source: "", notes: "" });
  const save = trpc.observations.upsert.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ القياس كمسودة للمراجعة.");
      utils.observations.list.invalidate();
      utils.dashboard.summary.invalidate();
      setForm((current) => ({ ...current, value: "", targetValue: "", notes: "" }));
    },
    onError: (error) => toast.error(error.message),
  });
  const status = trpc.observations.setStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة التحقق.");
      utils.observations.list.invalidate();
      utils.dashboard.summary.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const availableIndicators = useMemo(() => (indicators.data ?? []).filter((item) => item.status !== "archived"), [indicators.data]);
  const selectedIndicator = availableIndicators.find((item) => item.id === Number(form.indicatorId));
  const annualSeries = useMemo(() => (observations.data ?? [])
    .filter((item) => item.observation.indicatorId === Number(form.indicatorId) && item.observation.period === "annual")
    .sort((a, b) => a.observation.year - b.observation.year)
    .map((item) => ({ year: item.observation.year, value: asNumber(item.observation.value), target: item.observation.targetValue ? asNumber(item.observation.targetValue) : undefined })), [observations.data, form.indicatorId]);
  const forecastInput = useMemo(() => ({ indicatorId: Number(form.indicatorId), horizon: 5, method: "historical_cagr" as const }), [form.indicatorId]);
  const forecast = trpc.forecast.calculate.useQuery(forecastInput, { enabled: Number.isInteger(forecastInput.indicatorId) && forecastInput.indicatorId > 0 });
  const chartSeries = useMemo(() => buildDataEntryChartSeries(annualSeries, forecast.data?.forecast ?? []), [annualSeries, forecast.data]);
  const unitRule = useMemo(() => getUnitRule(selectedIndicator?.unit), [selectedIndicator?.unit]);
  const valueError = validateUnitValue(selectedIndicator?.unit, form.value === "" ? undefined : Number(form.value), "القيمة");
  const targetValueError = validateUnitValue(selectedIndicator?.unit, form.targetValue === "" ? undefined : Number(form.targetValue), "القيمة المستهدفة");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canWrite) return;
    if (!form.indicatorId || !form.value) {
      toast.error("يرجى اختيار المؤشر وإدخال القيمة.");
      return;
    }
    if (valueError || targetValueError) {
      toast.error(valueError || targetValueError || "تحقق من القيم المدخلة.");
      return;
    }
    save.mutate(createObservationPayload(form));
  }

  return <div className="space-y-6">
    <section><h1 className="page-title">إدخال البيانات الدورية</h1><p className="page-subtitle">إدخال قياسات سنوية وربع سنوية، وربطها بالمصدر وحالة التحقق للمراجعة والاعتماد.</p></section>
    {(indicators.isError || observations.isError) && <QueryStateError message="تعذر تحميل المؤشرات أو سجل القياسات." onRetry={() => { indicators.refetch(); observations.refetch(); }} />}

    {canWrite ? <form onSubmit={submit} className="section-card p-5 md:p-6">
      <div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e6f1ee] text-[#0f5c58]"><Database className="h-5 w-5" /></span><div><h2 className="font-bold text-[#173f3d]">إضافة أو تحديث قياس</h2><p className="mt-1 text-xs text-slate-500">يتحول الإدخال إلى مسودة؛ استخدم الحالة أدناه لمراجعته أو اعتماده.</p></div></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="المؤشر"><Select value={form.indicatorId} onValueChange={(value) => setForm((current) => ({ ...current, indicatorId: value }))}><SelectTrigger><SelectValue placeholder="اختر مؤشراً" /></SelectTrigger><SelectContent>{availableIndicators.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name} — {item.code}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="السنة"><Input type="number" min="2000" max="2100" value={form.year} onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))} /></Field>
        <Field label="نوع الفترة"><Select value={form.period} onValueChange={(value: "annual" | "quarterly") => setForm((current) => ({ ...current, period: value, quarter: value === "annual" ? "annual" : "Q1" }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="annual">سنوي</SelectItem><SelectItem value="quarterly">ربع سنوي</SelectItem></SelectContent></Select></Field>
        <Field label="الربع"><Select value={form.quarter} onValueChange={(value) => setForm((current) => ({ ...current, quarter: value }))} disabled={form.period === "annual"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Q1", "Q2", "Q3", "Q4"].map((quarter) => <SelectItem key={quarter} value={quarter}>{quarter}</SelectItem>)}</SelectContent></Select></Field>
        <Field label={`القيمة${selectedIndicator ? ` (${selectedIndicator.unit})` : ""}`} error={valueError}><Input required inputMode="decimal" type="number" min={unitRule.min} max={unitRule.max} step={unitRule.step} aria-invalid={Boolean(valueError)} value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} /></Field>
        <Field label={`القيمة المستهدفة${selectedIndicator ? ` (${selectedIndicator.unit})` : ""}`} error={targetValueError}><Input inputMode="decimal" type="number" min={unitRule.min} max={unitRule.max} step={unitRule.step} aria-invalid={Boolean(targetValueError)} value={form.targetValue} onChange={(event) => setForm((current) => ({ ...current, targetValue: event.target.value }))} /></Field>
        <Field label="مصدر البيانات"><Input value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} placeholder={selectedIndicator?.officialSource || "اسم الجهة أو النظام المصدر"} /></Field>
        <Field label="ملاحظات"><Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="توضيح مختصر عند الحاجة" /></Field>
      </div>
      {selectedIndicator && <IndicatorProfile indicator={selectedIndicator} />}
      {selectedIndicator && <p className="mt-3 flex items-start gap-2 text-xs leading-6 text-slate-600"><Info className="mt-0.5 h-4 w-4 shrink-0 text-[#0f5c58]" />{unitRule.hint}</p>}
      <Button type="submit" className="mt-5 bg-[#0f5c58] hover:bg-[#0a4845]" disabled={save.isPending}><Save className="ml-1.5 h-4 w-4" />حفظ القياس</Button>
    </form> : <div className="rounded-2xl border border-[#cfe0da] bg-[#edf7f3] px-5 py-4 text-sm leading-7 text-[#23574e]">دور viewer يتيح عرض البيانات المعتمدة وسجل القياسات فقط، ولا يتيح إدخال بيانات جديدة.</div>}

    {form.indicatorId && <section className="section-card p-5 md:p-6"><div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h2 className="font-bold text-[#173f3d]">المسار التاريخي والتوقعات</h2><p className="mt-1 text-xs text-slate-500">الاتجاه السنوي للمؤشر المحدد: {selectedIndicator?.name ?? "—"}. مرّر على النقاط أو استخدم شريط النطاق لاستكشاف الفترة.</p></div><span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#eef7f4] px-3 py-1 text-xs font-bold text-[#0f5c58]"><ChartNoAxesCombined className="h-3.5 w-3.5" />تفاعلي</span></div>{chartSeries.length ? <><div className="h-72" dir="ltr"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartSeries} margin={{ top: 8, right: 16, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#e4ece9" /><XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 12 }} /><YAxis tick={{ fill: "#64748b", fontSize: 12 }} /><Tooltip formatter={(value, name) => [arabicNumber.format(Number(value)), String(name)]} /><Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} /><Line type="monotone" dataKey="actual" name="تاريخي" stroke="#0f5c58" strokeWidth={3} dot={{ r: 4 }} connectNulls />{chartSeries.some((point) => point.target !== undefined) && <Line type="monotone" dataKey="target" name="المستهدف" stroke="#c58a3f" strokeDasharray="6 4" strokeWidth={2} dot={false} connectNulls />}{forecast.data && <Line type="monotone" dataKey="forecast" name="متوقع" stroke="#277c95" strokeDasharray="8 5" strokeWidth={3} dot={{ r: 4 }} connectNulls />}<Brush dataKey="year" height={24} stroke="#9abcb2" travellerWidth={9} /></LineChart></ResponsiveContainer></div>{forecast.isError && <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-800"><Info className="mt-0.5 h-4 w-4 shrink-0" />تحتاج التوقعات إلى قياسين سنويين معتمدين على الأقل. ما زال الرسم يعرض البيانات التاريخية والأهداف المحفوظة.</div>}</> : <div className="rounded-xl border border-dashed border-[#cfe0da] bg-[#f8fbf9] p-5 text-sm leading-7 text-slate-500">لا توجد قياسات سنوية للمؤشر المحدد بعد؛ ستظهر البيانات التاريخية والتوقعات فور تسجيل قياسات كافية.</div>}</section>}

    <section className="table-shell"><div className="border-b border-[#e8efec] p-4"><h2 className="font-bold text-[#173f3d]">سجل القياسات</h2><p className="mt-1 text-xs text-slate-500">يشمل القياسات السنوية والربع سنوية وحالة تحقق كل قياس.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-right text-sm"><thead className="bg-[#f6f9f7] text-xs text-slate-500"><tr><th className="px-5 py-3">المؤشر</th><th className="px-4 py-3">الفترة</th><th className="px-4 py-3">القيمة</th><th className="px-4 py-3">المصدر</th><th className="px-4 py-3">حالة التحقق</th>{canWrite && <th className="px-4 py-3">إجراء</th>}</tr></thead><tbody className="divide-y divide-[#edf2ef]">{observations.isLoading ? <tr><td colSpan={6} className="p-8 text-center text-slate-500">جارٍ تحميل القياسات…</td></tr> : observations.data?.length ? observations.data.map((item) => <tr key={item.observation.id} className="hover:bg-[#fbfdfc]"><td className="px-5 py-3.5"><p className="font-semibold text-[#244844]">{item.indicator.name}</p><p className="mt-0.5 text-xs text-slate-500" dir="ltr">{item.indicator.code}</p></td><td className="px-4 py-3.5 text-slate-600">{formatYear(item.observation.year)} · {periodLabel(item.observation.period, item.observation.quarter)}</td><td className="px-4 py-3.5 font-bold text-[#0f5c58]">{arabicNumber.format(asNumber(item.observation.value))} <span className="text-xs font-normal text-slate-500">{item.indicator.unit}</span></td><td className="px-4 py-3.5 text-slate-600">{item.observation.source || "—"}</td><td className="px-4 py-3.5"><Badge className={`${observationStatusMeta[item.observation.verificationStatus].className} border-0`}>{observationStatusMeta[item.observation.verificationStatus].label}</Badge></td>{canWrite && <td className="px-4 py-3.5"><Select value={item.observation.verificationStatus} onValueChange={(value: "draft" | "reviewed" | "approved" | "rejected") => status.mutate({ id: item.observation.id, status: value })}><SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">مسودة</SelectItem><SelectItem value="reviewed">قيد المراجعة</SelectItem><SelectItem value="approved">معتمد</SelectItem><SelectItem value="rejected">مرفوض</SelectItem></SelectContent></Select></td>}</tr>) : <tr><td colSpan={6} className="p-10 text-center text-slate-500">لا توجد قياسات مسجلة حتى الآن.</td></tr>}</tbody></table></div></section>
  </div>;
}

export function IndicatorProfile({ indicator }: { indicator: IndicatorProfileSource }) {
  return <section aria-live="polite" className="mt-5 rounded-2xl border border-[#bfddd3] bg-[#f4faf7] p-4 md:p-5"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#dff0e9] text-[#0f5c58]"><Tag className="h-4 w-4" /></span><div><h3 className="font-bold text-[#173f3d]">بيانات المؤشر المختار</h3><p className="mt-0.5 text-xs text-slate-500">تظهر تلقائياً لتأكيد نوع القياس ووحدة الإدخال قبل الحفظ.</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{getIndicatorProfileEntries(indicator).map((entry) => <Detail key={entry.label} {...entry} />)}</div></section>;
}

function Detail({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) { return <div className="rounded-xl border border-[#d9e9e2] bg-white px-3 py-2.5"><p className="text-[11px] font-medium text-slate-500">{label}</p><p className="mt-1 truncate text-sm font-bold text-[#244844]" dir={ltr ? "ltr" : "rtl"}>{value}</p></div>; }
function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) { return <label><span className="field-label">{label}</span>{children}{error && <span className="mt-1 block text-xs leading-5 text-rose-700">{error}</span>}</label>; }
