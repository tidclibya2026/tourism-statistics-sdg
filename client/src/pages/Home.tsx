import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { arabicNumber, asNumber, axisMeta, observationStatusMeta, periodLabel } from "@/lib/tourism";
import { trpc } from "@/lib/trpc";
import { Activity, BadgeCheck, CalendarDays, ChartNoAxesCombined, Database, Layers3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";

const axisColors = ["#c58a3f", "#25829a", "#20806c"];

function MetricCard({ label, value, icon: Icon, hint, tone }: { label: string; value: string | number; icon: typeof Layers3; hint: string; tone: string }) {
  return (
    <Card className="metric-card overflow-hidden border-0">
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[#173f3d]">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{hint}</p>
        </div>
        <span className={`grid h-11 w-11 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const [year, setYear] = useState("all");
  const [axis, setAxis] = useState("all");
  const [framework, setFramework] = useState("all");
  const dashboardInput = useMemo(() => ({
    year: year === "all" ? undefined : Number(year),
    axis: axis === "all" ? undefined : axis as "اقتصادي" | "اجتماعي" | "بيئي",
    framework: framework === "all" ? undefined : framework as "UNWTO" | "SDG",
  }), [year, axis, framework]);
  const dashboard = trpc.dashboard.summary.useQuery(dashboardInput);
  const data = dashboard.data;

  if (dashboard.isLoading) {
    return <div className="space-y-5"><Skeleton className="h-28 w-full rounded-2xl" /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton className="h-36 rounded-2xl" key={index} />)}</div><Skeleton className="h-80 rounded-2xl" /></div>;
  }

  const summary = data?.summary ?? { totalIndicators: 0, publishedIndicators: 0, approvedObservations: 0, latestYear: null };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[1.5rem] bg-[#0f5c58] px-6 py-7 text-white shadow-[0_20px_45px_rgba(15,92,88,.18)] md:px-8">
        <div className="absolute -left-10 -top-14 h-44 w-44 rounded-full border-[20px] border-[#c58a3f]/25" />
        <div className="relative max-w-2xl">
          <Badge className="mb-3 border-0 bg-[#c58a3f] text-[#143a38] hover:bg-[#c58a3f]">UNWTO + SDG</Badge>
          <h1 className="text-2xl font-bold md:text-3xl">لوحة المؤشرات السياحية الوطنية</h1>
          <p className="mt-2 max-w-xl leading-7 text-teal-50/85">متابعة مركزية لمؤشرات السياحة الاقتصادية والاجتماعية والبيئية، مع مصدر موحد للبيانات وتقارير قابلة للاعتماد.</p>
        </div>
      </section>

      <section className="section-card flex flex-col gap-3 p-4 md:flex-row md:items-end md:justify-between">
        <div><h2 className="font-bold text-[#173f3d]">فلاتر العرض</h2><p className="mt-1 text-xs text-slate-500">تُحدّث البطاقات والرسوم وأحدث القياسات بحسب الاختيارات.</p></div>
        <div className="grid gap-2 sm:grid-cols-4 sm:items-end">
          <label><span className="field-label">السنة</span><Select value={year} onValueChange={setYear}><SelectTrigger className="w-full sm:w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل السنوات</SelectItem>{(data?.availableYears ?? []).map((option) => <SelectItem key={option} value={String(option)}>{arabicNumber.format(option)}</SelectItem>)}</SelectContent></Select></label>
          <label><span className="field-label">المحور</span><Select value={axis} onValueChange={setAxis}><SelectTrigger className="w-full sm:w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل المحاور</SelectItem><SelectItem value="اقتصادي">اقتصادي</SelectItem><SelectItem value="اجتماعي">اجتماعي</SelectItem><SelectItem value="بيئي">بيئي</SelectItem></SelectContent></Select></label>
          <label><span className="field-label">الإطار</span><Select value={framework} onValueChange={setFramework}><SelectTrigger className="w-full sm:w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الأطر</SelectItem><SelectItem value="UNWTO">UNWTO</SelectItem><SelectItem value="SDG">SDG</SelectItem></SelectContent></Select></label>
          <Button variant="outline" className="h-10" onClick={() => { setYear("all"); setAxis("all"); setFramework("all"); }}>إعادة الضبط</Button>
        </div>
      </section>

      {dashboard.isError && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">تعذر تحميل لوحة المؤشرات. <button className="mr-2 font-bold underline" onClick={() => dashboard.refetch()}>إعادة المحاولة</button></div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="إجمالي المؤشرات" value={arabicNumber.format(summary.totalIndicators)} icon={Layers3} hint="المؤشرات المعرفة في المنظومة" tone="bg-[#e6f1ee] text-[#0f5c58]" />
        <MetricCard label="المؤشرات المنشورة" value={arabicNumber.format(summary.publishedIndicators)} icon={BadgeCheck} hint="متاحة للعرض والتقارير" tone="bg-[#f9eedc] text-[#a46725]" />
        <MetricCard label="القياسات المعتمدة" value={arabicNumber.format(summary.approvedObservations)} icon={Database} hint="سجلات ذات حالة اعتماد" tone="bg-[#e5f2f7] text-[#277c95]" />
        <MetricCard label="آخر سنة بيانات" value={summary.latestYear ? arabicNumber.format(summary.latestYear) : "—"} icon={CalendarDays} hint="للقياسات السنوية المعتمدة" tone="bg-[#e9f3ed] text-[#2b8062]" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_.9fr]">
        <Card className="border-[#dce8e4] shadow-sm">
          <CardContent className="p-5 md:p-6">
            <div className="mb-5 flex items-start justify-between">
              <div><h3 className="font-bold text-[#173f3d]">حركة القياسات السنوية المعتمدة</h3><p className="mt-1 text-xs text-slate-500">عدد القياسات المعتمدة خلال كل سنة.</p></div>
              <Activity className="h-5 w-5 text-[#0f5c58]" />
            </div>
            {data?.trendByYear?.length ? (
              <div className="h-72" dir="ltr"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.trendByYear} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#e4ece9" /><XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 12 }} /><Tooltip formatter={(value) => [arabicNumber.format(Number(value)), "قياسات"]} /><Line type="monotone" dataKey="observations" stroke="#0f5c58" strokeWidth={3} dot={{ r: 4, fill: "#c58a3f", strokeWidth: 2 }} /></LineChart></ResponsiveContainer></div>
            ) : <EmptyChart message="ستظهر الحركة السنوية فور اعتماد أول قياس سنوي." />}
          </CardContent>
        </Card>

        <Card className="border-[#dce8e4] shadow-sm">
          <CardContent className="p-5 md:p-6">
            <div className="mb-5 flex items-start justify-between"><div><h3 className="font-bold text-[#173f3d]">توزيع المؤشرات حسب المحور</h3><p className="mt-1 text-xs text-slate-500">تصنيف المؤشرات في الإطار الوطني.</p></div><ChartNoAxesCombined className="h-5 w-5 text-[#0f5c58]" /></div>
            {data?.axisDistribution?.some((item) => item.count > 0) ? (
              <div className="h-72" dir="ltr"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.axisDistribution} layout="vertical" margin={{ top: 8, right: 24, left: 16, bottom: 0 }}><CartesianGrid horizontal={false} stroke="#e4ece9" /><XAxis type="number" allowDecimals={false} hide /><YAxis type="category" dataKey="axis" width={76} tick={{ fill: "#475569", fontSize: 12 }} /><Tooltip formatter={(value) => [arabicNumber.format(Number(value)), "مؤشر"]} /><Bar dataKey="count" radius={[0, 7, 7, 0]}>{data.axisDistribution.map((entry, index) => <Cell fill={axisColors[index]} key={entry.axis} />)}</Bar></BarChart></ResponsiveContainer></div>
            ) : <EmptyChart message="ستظهر خريطة التوزيع بعد تعريف المؤشرات." />}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_.9fr]">
        <Card className="border-[#dce8e4] shadow-sm"><CardContent className="p-5 md:p-6"><div className="mb-4"><h3 className="font-bold text-[#173f3d]">أحدث القياسات</h3><p className="mt-1 text-xs text-slate-500">آخر قياسات تم إدخالها أو مراجعتها في المنظومة.</p></div>{data?.recent?.length ? <div className="divide-y divide-[#e8efec]">{data.recent.map((item) => <div className="flex items-center justify-between gap-4 py-3" key={item.observation.id}><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#254743]">{item.indicator.name}</p><p className="mt-1 text-xs text-slate-500">{arabicNumber.format(item.observation.year)} · {periodLabel(item.observation.period, item.observation.quarter)}</p></div><div className="flex items-center gap-3"><span className="text-sm font-bold text-[#0f5c58]">{arabicNumber.format(asNumber(item.observation.value))} {item.indicator.unit}</span><Badge className={`${observationStatusMeta[item.observation.verificationStatus].className} border-0`}>{observationStatusMeta[item.observation.verificationStatus].label}</Badge></div></div>)}</div> : <EmptyText text="لا توجد قياسات بعد. يستطيع مدير النظام أو محلل البيانات البدء من صفحة إدخال البيانات." />}</CardContent></Card>
        <Card className="border-[#dce8e4] shadow-sm"><CardContent className="p-5 md:p-6"><h3 className="font-bold text-[#173f3d]">مرجع المنظومة</h3><p className="mt-1 text-xs leading-6 text-slate-500">يربط التطبيق تعريف المؤشر، قياسه الدوري، مصدره، وحالة التحقق ضمن قاعدة بيانات موحدة.</p><div className="mt-5 space-y-3">{(["اقتصادي", "اجتماعي", "بيئي"] as const).map((axis) => <div className="flex items-center justify-between rounded-xl bg-[#f6f9f7] px-3 py-2.5" key={axis}><Badge className={`${axisMeta[axis].className} border`}>{axis}</Badge><span className="text-xs text-slate-500">UNWTO / SDG</span></div>)}</div></CardContent></Card>
      </section>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) { return <div className="grid h-72 place-items-center rounded-xl border border-dashed border-[#cfe0da] bg-[#f8fbf9] p-7 text-center text-sm leading-6 text-slate-500">{message}</div>; }
function EmptyText({ text }: { text: string }) { return <p className="rounded-xl border border-dashed border-[#cfe0da] bg-[#f8fbf9] p-5 text-sm leading-7 text-slate-500">{text}</p>; }
