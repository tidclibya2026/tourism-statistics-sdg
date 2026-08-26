import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  arabicNumber,
  asNumber,
  axisMeta,
  formatYear,
  observationStatusMeta,
  periodLabel,
} from "@/lib/tourism";
import { trpc } from "@/lib/trpc";
import { downloadDashboardWorkbook } from "@/lib/dashboardDownload";
import { exportDashboardPdf } from "@/lib/dashboardPdf";
import { Streamdown } from "streamdown";
import html2canvas from "html2canvas";
import {
  Activity,
  BadgeCheck,
  CalendarDays,
  ChartNoAxesCombined,
  Database,
  FileSpreadsheet,
  FileText,
  ImageDown,
  Layers3,
  LoaderCircle,
  MapPin,
  MapPinned,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MapView } from "@/components/Map";
import { detachMapMarkers } from "@shared/mapMarkers";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const axisColors = ["#c58a3f", "#25829a", "#20806c"];

function MetricCard({
  label,
  value,
  icon: Icon,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  icon: typeof Layers3;
  hint: string;
  tone: string;
}) {
  return (
    <Card
      className="metric-card group relative overflow-visible border-0"
      title={`${label}: ${hint}`}
    >
      <div className="pointer-events-none absolute right-4 top-full z-20 mt-2 hidden w-64 rounded-xl border border-[#cfe2db] bg-white p-3 text-xs leading-6 text-slate-600 shadow-xl group-hover:block group-focus-within:block">
        {hint}
      </div>
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[#173f3d]">
            {value}
          </p>
          <p className="mt-2 text-xs text-slate-500">{hint}</p>
        </div>
        <span
          className={`grid h-11 w-11 place-items-center rounded-xl ${tone}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const [year, setYear] = useState("all");
  const [areaId, setAreaId] = useState("all");
  const [axis, setAxis] = useState("all");
  const [framework, setFramework] = useState("all");
  const [sdgReference, setSdgReference] = useState("all");
  const [indicatorAId, setIndicatorAId] = useState("all");
  const [indicatorBId, setIndicatorBId] = useState("all");
  const dashboardRef = useRef<HTMLDivElement>(null);
  const comparisonRef = useRef<HTMLDivElement>(null);
  const dashboardInput = useMemo(
    () => ({
      year: year === "all" ? undefined : Number(year),
      axis:
        axis === "all" ? undefined : (axis as "اقتصادي" | "اجتماعي" | "بيئي"),
      framework:
        framework === "all" ? undefined : (framework as "UNWTO" | "SDG"),
      sdgReference:
        sdgReference === "all"
          ? undefined
          : (sdgReference as
              | "SDG 8"
              | "SDG 11"
              | "SDG 12"
              | "SDG 14"
              | "SDG 17"),
    }),
    [year, axis, framework, sdgReference]
  );
  const dashboard = trpc.dashboard.summary.useQuery(dashboardInput);
  const spatialOptions = trpc.spatial.overview.useQuery({});
  const spatial = trpc.spatial.overview.useQuery({
    year: year === "all" ? undefined : Number(year),
    areaId: areaId === "all" ? undefined : Number(areaId),
  });
  const narrative = trpc.dashboard.narrative.useMutation();
  const data = dashboard.data;
  const [exporting, setExporting] = useState<"excel" | "pdf" | "png" | null>(null);
  const isRefreshing =
    dashboard.isFetching || spatial.isFetching || spatialOptions.isFetching;
  const indicatorOptions = data?.indicators ?? [];
  const comparisonA =
    indicatorAId === "all"
      ? null
      : indicatorOptions.find(item => item.id === Number(indicatorAId));
  const comparisonB =
    indicatorBId === "all"
      ? null
      : indicatorOptions.find(item => item.id === Number(indicatorBId));
  const comparisonRowA = comparisonA
    ? data?.latest?.find(item => item.indicator.id === comparisonA.id)
    : null;
  const comparisonRowB = comparisonB
    ? data?.latest?.find(item => item.indicator.id === comparisonB.id)
    : null;

  const summary = data?.summary ?? {
    totalIndicators: 0,
    publishedIndicators: 0,
    approvedObservations: 0,
    latestYear: null,
    indicatorsWithTargets: 0,
    achievedTargets: 0,
  };
  const hasTargets = Boolean(data?.targetPerformance?.length);
  const firstCoverageYear = data?.trendByYear?.[0]?.year;
  const latestSpatialYear = spatial.data?.availableYears?.[0];
  const areaOptions = useMemo(
    () => [
      ...(spatialOptions.data?.regions ?? []),
      ...(spatialOptions.data?.cities ?? []),
    ],
    [spatialOptions.data]
  );
  const activeAreas = useMemo(() => {
    const counts = new Map<
      string,
      { name: string; type: string; count: number }
    >();
    (spatial.data?.observations ?? [])
      .filter(item => item.year === latestSpatialYear)
      .forEach(item => {
        const current = counts.get(item.areaName) ?? {
          name: item.areaName,
          type: item.areaType === "city" ? "مدينة" : "إقليم",
          count: 0,
        };
        current.count += 1;
        counts.set(item.areaName, current);
      });
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ar"))
      .slice(0, 5);
  }, [latestSpatialYear, spatial.data]);

  if (dashboard.isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton className="h-36 rounded-2xl" key={index} />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  async function exportExcel() {
    if (!data) {
      toast.error("لا تتوفر بيانات لوحة المعلومات للتصدير.");
      return;
    }
    setExporting("excel");
    try {
      const chart = dashboardRef.current?.querySelector(
        ".recharts-responsive-container"
      ) as HTMLElement | null;
      const chartImage = chart
        ? (
            await html2canvas(chart, {
              scale: 2,
              backgroundColor: "#ffffff",
              useCORS: true,
            })
          ).toDataURL("image/png")
        : undefined;
      await downloadDashboardWorkbook(data, chartImage);
      toast.success("تم تنزيل لوحة المؤشرات بصيغة Excel.");
    } catch {
      toast.error("تعذر إنشاء ملف Excel في الوقت الحالي.");
    } finally {
      setExporting(null);
    }
  }

  async function exportSnapshot(format: "png" | "pdf") {
    if (!comparisonRef.current) {
      toast.error("لا تتوفر المقارنة لحفظها.");
      return;
    }
    setExporting(format);
    try {
      if (format === "png") {
        const canvas = await html2canvas(comparisonRef.current, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
        });
        const link = document.createElement("a");
        link.download = `مقارنة-المؤشرات-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        toast.success("تم حفظ لقطة المقارنة كصورة.");
      } else {
        await exportDashboardPdf(
          comparisonRef.current,
          `مقارنة-المؤشرات-${new Date().toISOString().slice(0, 10)}.pdf`
        );
        toast.success("تم فتح نافذة حفظ لقطة المقارنة كـPDF.");
      }
    } catch {
      toast.error("تعذر حفظ لقطة المقارنة في الوقت الحالي.");
    } finally {
      setExporting(null);
    }
  }

  async function exportPdf() {
    if (!dashboardRef.current || !data) {
      toast.error("لا تتوفر بيانات لوحة المعلومات للتصدير.");
      return;
    }
    setExporting("pdf");
    try {
      await exportDashboardPdf(
        dashboardRef.current,
        `لوحة-المؤشرات-${new Date().toISOString().slice(0, 10)}.pdf`
      );
      toast.success(
        "تم فتح نافذة حفظ PDF؛ ستعود إلى المنصة بعد الحفظ أو الإلغاء."
      );
    } catch {
      toast.error("تعذر إنشاء ملف PDF في الوقت الحالي.");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="relative space-y-6" ref={dashboardRef}>
      {isRefreshing && (
        <div
          className="sticky top-3 z-30 mx-auto flex w-fit items-center gap-2 rounded-full border border-[#b9d7cf] bg-white/95 px-4 py-2 text-xs font-semibold text-[#0f766e] shadow-lg"
          role="status"
          aria-live="polite"
        >
          <LoaderCircle className="h-4 w-4 animate-spin" />
          جارٍ تحديث البيانات حسب الفلاتر…
        </div>
      )}
      <section className="relative overflow-hidden rounded-[1.5rem] bg-[#0f5c58] px-6 py-7 text-white shadow-[0_20px_45px_rgba(15,92,88,.18)] md:px-8">
        <div className="absolute -left-10 -top-14 h-44 w-44 rounded-full border-[20px] border-[#c58a3f]/25" />
        <div className="relative max-w-2xl">
          <Badge className="mb-3 border-0 bg-[#c58a3f] text-[#143a38] hover:bg-[#c58a3f]">
            UNWTO + SDG
          </Badge>
          <h1 className="text-2xl font-bold md:text-3xl">
            لوحة المؤشرات السياحية الوطنية
          </h1>
          <p className="mt-2 max-w-xl leading-7 text-teal-50/85">
            متابعة مركزية لمؤشرات السياحة الاقتصادية والاجتماعية والبيئية، مع
            مصدر موحد للبيانات وتقارير قابلة للاعتماد.
          </p>
        </div>
      </section>

      <section className="section-card flex flex-col gap-3 p-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-bold text-[#173f3d]">فلاتر العرض</h2>
          <p className="mt-1 text-xs text-slate-500">
            تُحدّث البطاقات والرسوم وأحدث القياسات بحسب الاختيارات.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-6 sm:items-end">
          <label>
            <span className="field-label">السنة</span>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-full sm:w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل السنوات</SelectItem>
                {(data?.availableYears ?? []).map(option => (
                  <SelectItem key={option} value={String(option)}>
                    {formatYear(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label>
            <span className="field-label">المنطقة / المدينة</span>
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger className="w-full sm:w-40">
                <MapPin className="ml-1.5 h-4 w-4 text-[#0f766e]" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المناطق</SelectItem>
                {areaOptions.map(area => (
                  <SelectItem key={area.id} value={String(area.id)}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label>
            <span className="field-label">المحور</span>
            <Select value={axis} onValueChange={setAxis}>
              <SelectTrigger className="w-full sm:w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المحاور</SelectItem>
                <SelectItem value="اقتصادي">اقتصادي</SelectItem>
                <SelectItem value="اجتماعي">اجتماعي</SelectItem>
                <SelectItem value="بيئي">بيئي</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label>
            <span className="field-label">الإطار</span>
            <Select value={framework} onValueChange={setFramework}>
              <SelectTrigger className="w-full sm:w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأطر</SelectItem>
                <SelectItem value="UNWTO">UNWTO</SelectItem>
                <SelectItem value="SDG">SDG</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label>
            <span className="field-label">هدف التنمية</span>
            <Select value={sdgReference} onValueChange={setSdgReference}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأهداف</SelectItem>
                <SelectItem value="SDG 8">SDG 8</SelectItem>
                <SelectItem value="SDG 11">SDG 11</SelectItem>
                <SelectItem value="SDG 12">SDG 12</SelectItem>
                <SelectItem value="SDG 14">SDG 14</SelectItem>
                <SelectItem value="SDG 17">SDG 17</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <Button
            variant="outline"
            className="h-10"
            onClick={() => {
              setYear("all");
              setAreaId("all");
              setAxis("all");
              setFramework("all");
              setSdgReference("all");
            }}
          >
            إعادة الضبط
          </Button>
        </div>
      </section>

      <section className="section-card flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-bold text-[#173f3d]">تصدير لوحة المعلومات</h2>
          <p className="mt-1 text-xs text-slate-500">
            يتضمن PDF الرسوم المرئية الحالية، بينما يضم Excel الملخص وبيانات
            الرسوم وتحقيق الأهداف.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={exportExcel}
            disabled={Boolean(exporting) || dashboard.isLoading}
            aria-busy={exporting === "excel"}
          >
            {exporting === "excel" ? (
              <LoaderCircle className="ml-1.5 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="ml-1.5 h-4 w-4 text-emerald-700" />
            )}
            Excel
          </Button>
          <Button
            className="bg-[#0f5c58] hover:bg-[#0a4845]"
            onClick={exportPdf}
            disabled={Boolean(exporting) || dashboard.isLoading}
            aria-busy={exporting === "pdf"}
          >
            {exporting === "pdf" ? (
              <LoaderCircle className="ml-1.5 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="ml-1.5 h-4 w-4" />
            )}
            PDF
          </Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#cae1d7] bg-[linear-gradient(135deg,#eff9f4,#f9fcfa)] p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#dff0e9] text-[#0f5c58]">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bold text-[#173f3d]">
                ملخص ذكي للوحة المعلومات
              </h2>
              <p className="mt-1 max-w-2xl text-xs leading-6 text-slate-600">
                ينشأ التقرير عند الطلب من البيانات المصفاة فقط، ولا يضيف أرقاماً
                أو استنتاجات غير موجودة في سجلات المنظومة.
              </p>
            </div>
          </div>
          <Button
            className="bg-[#0f5c58] hover:bg-[#0a4845]"
            onClick={() => narrative.mutate(dashboardInput)}
            disabled={narrative.isPending || !data}
          >
            <Sparkles className="ml-1.5 h-4 w-4" />
            {narrative.isPending ? "جارٍ توليد الملخص…" : "توليد التقرير النصي"}
          </Button>
        </div>
        {narrative.isError && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {narrative.error.message}
          </div>
        )}
        {narrative.data?.text && (
          <div className="prose prose-slate mt-5 max-w-none rounded-xl border border-[#dbe9e3] bg-white p-4 text-sm leading-7 text-slate-700">
            <Streamdown>{narrative.data.text}</Streamdown>
          </div>
        )}
      </section>

      {dashboard.isError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          تعذر تحميل لوحة المؤشرات.{" "}
          <button
            className="mr-2 font-bold underline"
            onClick={() => dashboard.refetch()}
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {summary.approvedObservations > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl border border-[#b9d9cf] bg-[#f2faf6] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-bold text-[#173f3d]">نطاق العرض المعتمد</h2>
            <p className="mt-1 text-xs leading-6 text-slate-600">
              تتغذى هذه اللوحة من القياسات الوطنية المعتمدة فقط
              {firstCoverageYear && summary.latestYear
                ? ` للفترة ${formatYear(firstCoverageYear)}–${formatYear(summary.latestYear)}`
                : ""}
              . ولا تدخل المسودات أو البيانات الربع سنوية الجزئية في الرسوم
              والتحليلات النهائية.
            </p>
          </div>
          <Badge className="w-fit border-0 bg-[#dcefe7] text-[#0f5c58]">
            {arabicNumber.format(summary.approvedObservations)} قياساً معتمداً
          </Badge>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="إجمالي المؤشرات"
          value={arabicNumber.format(summary.totalIndicators)}
          icon={Layers3}
          hint="المؤشرات المعرفة في المنظومة"
          tone="bg-[#e6f1ee] text-[#0f5c58]"
        />
        <MetricCard
          label="المؤشرات المنشورة"
          value={arabicNumber.format(summary.publishedIndicators)}
          icon={BadgeCheck}
          hint="متاحة للعرض والتقارير"
          tone="bg-[#f9eedc] text-[#a46725]"
        />
        <MetricCard
          label="القياسات المعتمدة"
          value={arabicNumber.format(summary.approvedObservations)}
          icon={Database}
          hint="سجلات ذات حالة اعتماد"
          tone="bg-[#e5f2f7] text-[#277c95]"
        />
        <MetricCard
          label="آخر سنة بيانات"
          value={summary.latestYear ? formatYear(summary.latestYear) : "—"}
          icon={CalendarDays}
          hint="للقياسات السنوية المعتمدة"
          tone="bg-[#e9f3ed] text-[#2b8062]"
        />
        <MetricCard
          label="مؤشرات لها أهداف"
          value={arabicNumber.format(summary.indicatorsWithTargets)}
          icon={Target}
          hint="قياسات سنوية معتمدة مرتبطة بمستهدف"
          tone="bg-[#fff4df] text-[#b47730]"
        />
        <MetricCard
          label="أهداف محققة"
          value={arabicNumber.format(summary.achievedTargets)}
          icon={Trophy}
          hint="القيمة الفعلية تساوي الهدف أو تتجاوزه"
          tone="bg-[#e5f2f7] text-[#277c95]"
        />
      </section>

      <section ref={comparisonRef} className="section-card overflow-hidden p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e9f4f1] text-[#0f766e]">
                <ChartNoAxesCombined className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-bold text-[#173f3d]">مقارنة المؤشرات</h2>
                <p className="mt-1 text-xs text-slate-500">
                  اختر مؤشرين مختلفين لعرض آخر قياس معتمد لكل منهما جنباً إلى
                  جنب.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportSnapshot("png")}
              disabled={Boolean(exporting)}
            >
              <ImageDown className="ml-1.5 h-4 w-4" />
              لقطة صورة
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportSnapshot("pdf")}
              disabled={Boolean(exporting)}
            >
              <FileText className="ml-1.5 h-4 w-4" />
              لقطة PDF
            </Button>
          </div>
          <div className="grid w-full gap-2 sm:grid-cols-2 md:max-w-xl">
            <label>
              <span className="field-label">المؤشر الأول</span>
              <Select value={indicatorAId} onValueChange={setIndicatorAId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المؤشر الأول" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">اختر المؤشر الأول</SelectItem>
                  {indicatorOptions.map(item => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label>
              <span className="field-label">المؤشر الثاني</span>
              <Select value={indicatorBId} onValueChange={setIndicatorBId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المؤشر الثاني" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">اختر المؤشر الثاني</SelectItem>
                  {indicatorOptions
                    .filter(item => item.id !== Number(indicatorAId))
                    .map(item => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </label>
          </div>
        </div>
        {comparisonA && comparisonB ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-[#b9d7cf] bg-[#f4fbf8] p-4">
              <p className="text-xs font-semibold text-slate-500">
                {comparisonA.name}
              </p>
              <p className="mt-2 text-2xl font-bold text-[#0f5c58]">
                {comparisonRowA
                  ? arabicNumber.format(
                      asNumber(comparisonRowA.observation.value)
                    )
                  : "—"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                الوحدة: {comparisonA.unit} · السنة:{" "}
                {comparisonRowA
                  ? formatYear(comparisonRowA.observation.year)
                  : "لا توجد قيمة معتمدة"}
              </p>
            </div>
            <div className="rounded-2xl border border-[#ead8b7] bg-[#fffaf1] p-4">
              <p className="text-xs font-semibold text-slate-500">
                {comparisonB.name}
              </p>
              <p className="mt-2 text-2xl font-bold text-[#a46725]">
                {comparisonRowB
                  ? arabicNumber.format(
                      asNumber(comparisonRowB.observation.value)
                    )
                  : "—"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                الوحدة: {comparisonB.unit} · السنة:{" "}
                {comparisonRowB
                  ? formatYear(comparisonRowB.observation.year)
                  : "لا توجد قيمة معتمدة"}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-5 rounded-xl border border-dashed border-[#cfe0da] bg-[#f8fbf9] p-4 text-center text-sm text-slate-500">
            اختر مؤشرين مختلفين لعرض المقارنة. لا تُحسب فروق رقمية بين وحدات
            قياس مختلفة.
          </p>
        )}
      </section>

      <section className="section-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e9f4f1] text-[#0f766e]">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bold text-[#173f3d]">
                أحدث النشاطات والقياسات
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                آخر السجلات المعتمدة الظاهرة وفق فلاتر العرض وصلاحيات حسابك.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-[#b9d7cf] text-[#0f766e]">
            {arabicNumber.format(data?.recent?.length ?? 0)} سجلات
          </Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data?.recent?.length ? (
            data.recent.slice(0, 8).map(item => (
              <div
                key={item.observation.id}
                className="rounded-xl border border-[#e3ece9] bg-[#f9fcfa] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-semibold text-[#244844]">
                    {item.indicator.name}
                  </p>
                  <Badge className="shrink-0 border-0 bg-[#dff0e9] text-xs text-[#0f5c58]">
                    معتمد
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {formatYear(item.observation.year)} ·{" "}
                  {periodLabel(
                    item.observation.period,
                    item.observation.quarter
                  )}
                </p>
                <p className="mt-1 text-base font-bold text-[#0f5c58]">
                  {arabicNumber.format(asNumber(item.observation.value))}{" "}
                  <span className="text-xs font-normal text-slate-500">
                    {item.indicator.unit}
                  </span>
                </p>
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-[#dce8e4] p-5 text-center text-sm text-slate-500">
              لا توجد نشاطات معتمدة ضمن الفلاتر الحالية.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#0f5c58,#16786f)] text-white shadow-[0_18px_40px_rgba(15,92,88,.16)]">
          <CardContent className="p-5 md:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-teal-100">
                  آخر سنة مكانية متاحة:{" "}
                  {latestSpatialYear ? formatYear(latestSpatialYear) : "—"}
                </p>
                <h2 className="mt-1 text-xl font-bold">أكثر المناطق نشاطاً</h2>
                <p className="mt-1 text-xs leading-6 text-teal-50/80">
                  حسب عدد القياسات السنوية المعتمدة المتاحة لكل منطقة.
                </p>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
                <MapPinned className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {activeAreas.length ? (
                activeAreas.map((area, index) => (
                  <div
                    key={area.name}
                    className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#c58a3f] text-sm font-bold text-[#173f3d]">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {area.name}
                      </p>
                      <p className="text-[11px] text-teal-100/75">
                        {area.type}
                      </p>
                    </div>
                    <strong className="text-sm">
                      {arabicNumber.format(area.count)} قياس
                    </strong>
                  </div>
                ))
              ) : (
                <p className="rounded-xl bg-white/10 p-4 text-sm text-teal-50">
                  لا تتوفر قياسات مكانية معتمدة كافية للترتيب.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#fff8eb,#f7ead2)] shadow-[0_18px_40px_rgba(180,119,48,.12)]">
          <CardContent className="p-5 md:p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-[#a46725]">
                  من القياسات الوطنية السنوية المعتمدة
                </p>
                <h2 className="mt-1 text-xl font-bold text-[#173f3d]">
                  أعلى المؤشرات نمواً
                </h2>
                <p className="mt-1 text-xs leading-6 text-slate-600">
                  مقارنة بين أول وآخر سنة متاحة لكل مؤشر؛ لا تُعرض المؤشرات ذات
                  السلسلة غير الكافية.
                </p>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f1d9ad] text-[#a46725]">
                <TrendingUp className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {data?.indicatorGrowth?.length ? (
                data.indicatorGrowth.map((item, index) => (
                  <div
                    key={item.indicatorId}
                    className="flex items-center gap-3 rounded-xl border border-[#ead8b7] bg-white/65 px-3 py-2.5"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#f1d9ad] text-sm font-bold text-[#8d5c22]">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#244844]">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatYear(item.firstYear)}–{formatYear(item.lastYear)}{" "}
                        · {item.unit}
                      </p>
                    </div>
                    <strong
                      className={`text-sm ${item.growthPercent >= 0 ? "text-emerald-700" : "text-rose-700"}`}
                    >
                      {item.growthPercent >= 0 ? "+" : ""}
                      {item.growthPercent.toLocaleString("ar-LY", {
                        maximumFractionDigits: 1,
                      })}
                      %
                    </strong>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-[#e4cfaa] p-4 text-sm text-slate-600">
                  لا تتوفر سلسلة سنوية كافية لحساب النمو.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <DashboardActivityMap areas={activeAreas} year={latestSpatialYear} />

      <section className="grid gap-5 xl:grid-cols-[1.35fr_.95fr]">
        <Card className="border-[#dce8e4] shadow-sm">
          <CardContent className="p-5 md:p-6">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="font-bold text-[#173f3d]">
                  {hasTargets
                    ? "نسبة تحقيق المستهدفات"
                    : "التغطية الزمنية حسب المحور"}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {hasTargets
                    ? "مقارنة موحّدة بالقيمة المستهدفة = 100%، حتى عند اختلاف وحدات القياس."
                    : "عدد القياسات السنوية المعتمدة في كل محور؛ لا يمثل تغيراً في قيمة المؤشر."}
                </p>
              </div>
              <Target className="h-5 w-5 text-[#b47730]" />
            </div>
            {hasTargets ? (
              <div className="h-[340px]" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data?.targetPerformance?.slice(0, 8)}
                    layout="vertical"
                    margin={{ top: 4, right: 30, left: 22, bottom: 0 }}
                  >
                    <CartesianGrid horizontal={false} stroke="#e4ece9" />
                    <XAxis
                      type="number"
                      domain={[0, "dataMax + 10"]}
                      tickFormatter={value => `${value}%`}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={118}
                      tick={{ fill: "#475569", fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={value => [
                        `${Number(value).toLocaleString("ar-LY", { maximumFractionDigits: 1 })}%`,
                        "تحقيق الهدف",
                      ]}
                    />
                    <ReferenceLine
                      x={100}
                      stroke="#c58a3f"
                      strokeDasharray="5 4"
                      label={{
                        value: "الهدف",
                        position: "top",
                        fill: "#a46725",
                        fontSize: 11,
                      }}
                    />
                    <Bar
                      dataKey="attainment"
                      name="تحقيق الهدف"
                      radius={[0, 7, 7, 0]}
                    >
                      {data?.targetPerformance?.slice(0, 8).map(entry => (
                        <Cell
                          key={entry.indicatorId}
                          fill={
                            entry.status === "achieved" ? "#20806c" : "#d08a35"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : data?.axisCoverageByYear?.length ? (
              <div className="h-[340px]" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.axisCoverageByYear}
                    margin={{ top: 6, right: 12, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4ece9" />
                    <XAxis
                      dataKey="year"
                      tick={{ fill: "#64748b", fontSize: 11 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        arabicNumber.format(Number(value)),
                        name,
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    <Bar
                      stackId="axis"
                      dataKey="اقتصادي"
                      fill="#c58a3f"
                      radius={[0, 0, 4, 4]}
                    />
                    <Bar stackId="axis" dataKey="اجتماعي" fill="#25829a" />
                    <Bar
                      stackId="axis"
                      dataKey="بيئي"
                      fill="#20806c"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart message="ستظهر التغطية بعد اعتماد قياسات سنوية." />
            )}
          </CardContent>
        </Card>
        <Card className="border-[#dce8e4] shadow-sm">
          <CardContent className="p-5 md:p-6">
            <div className="mb-4">
              <h3 className="font-bold text-[#173f3d]">
                {hasTargets
                  ? "القيمة الفعلية مقابل الهدف"
                  : "قراءة جاهزية البيانات"}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {hasTargets
                  ? "أحدث قياس سنوي معتمد لكل مؤشر له هدف."
                  : "ملخص قابلية العرض؛ لا تُستبدل القيم المستهدفة غير الواردة في المصادر الرسمية."}
              </p>
            </div>
            {hasTargets ? (
              <div className="divide-y divide-[#e8efec]">
                {data?.targetPerformance?.slice(0, 6).map(item => (
                  <div className="py-3" key={item.indicatorId}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#254743]">
                          {item.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatYear(item.year)} · {item.unit}
                        </p>
                      </div>
                      <Badge
                        className={`${item.status === "achieved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"} border-0`}
                      >
                        {item.attainment.toLocaleString("ar-LY", {
                          maximumFractionDigits: 1,
                        })}
                        %
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        فعلي:{" "}
                        <strong className="text-[#0f5c58]">
                          {arabicNumber.format(item.actual)}
                        </strong>
                      </span>
                      <span className="text-slate-500">
                        مستهدف:{" "}
                        <strong className="text-[#b47730]">
                          {arabicNumber.format(item.target)}
                        </strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {data?.axisDistribution?.map(item => (
                  <div
                    key={item.axis}
                    className="rounded-xl bg-[#f6f9f7] px-3 py-3"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-[#254743]">
                        {item.axis}
                      </span>
                      <strong className="text-[#0f5c58]">
                        {arabicNumber.format(item.count)} مؤشر
                      </strong>
                    </div>
                  </div>
                ))}
                <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-xs leading-6 text-amber-900">
                  لا توجد قيم مستهدفة سنوية معتمدة في المصادر المتاحة؛ لذلك
                  تُعرض التغطية والبيانات الفعلية بدلاً من نسب أداء مصطنعة.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_.9fr]">
        <Card className="border-[#dce8e4] shadow-sm">
          <CardContent className="p-5 md:p-6">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="font-bold text-[#173f3d]">
                  حركة القياسات السنوية المعتمدة
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  عدد القياسات المعتمدة خلال كل سنة.
                </p>
              </div>
              <Activity className="h-5 w-5 text-[#0f5c58]" />
            </div>
            {data?.trendByYear?.length ? (
              <div className="h-72" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.trendByYear}
                    margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4ece9" />
                    <XAxis
                      dataKey="year"
                      tick={{ fill: "#64748b", fontSize: 12 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={value => [
                        arabicNumber.format(Number(value)),
                        "قياسات",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="observations"
                      stroke="#0f5c58"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#c58a3f", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart message="ستظهر الحركة السنوية فور اعتماد أول قياس سنوي." />
            )}
          </CardContent>
        </Card>

        <Card className="border-[#dce8e4] shadow-sm">
          <CardContent className="p-5 md:p-6">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="font-bold text-[#173f3d]">
                  توزيع المؤشرات حسب المحور
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  تصنيف المؤشرات في الإطار الوطني.
                </p>
              </div>
              <ChartNoAxesCombined className="h-5 w-5 text-[#0f5c58]" />
            </div>
            {data?.axisDistribution?.some(item => item.count > 0) ? (
              <div className="h-72" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.axisDistribution}
                    layout="vertical"
                    margin={{ top: 8, right: 24, left: 16, bottom: 0 }}
                  >
                    <CartesianGrid horizontal={false} stroke="#e4ece9" />
                    <XAxis type="number" allowDecimals={false} hide />
                    <YAxis
                      type="category"
                      dataKey="axis"
                      width={76}
                      tick={{ fill: "#475569", fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={value => [
                        arabicNumber.format(Number(value)),
                        "مؤشر",
                      ]}
                    />
                    <Bar dataKey="count" radius={[0, 7, 7, 0]}>
                      {data.axisDistribution.map((entry, index) => (
                        <Cell fill={axisColors[index]} key={entry.axis} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart message="ستظهر خريطة التوزيع بعد تعريف المؤشرات." />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_.9fr]">
        <Card className="border-[#dce8e4] shadow-sm">
          <CardContent className="p-5 md:p-6">
            <div className="mb-4">
              <h3 className="font-bold text-[#173f3d]">
                أحدث القياسات المعتمدة
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                تُعرض القياسات ذات حالة الاعتماد فقط؛ لا تظهر المسودات في النسخة
                النهائية.
              </p>
            </div>
            {data?.recent?.length ? (
              <div className="divide-y divide-[#e8efec]">
                {data.recent.map(item => (
                  <div
                    className="flex items-center justify-between gap-4 py-3"
                    key={item.observation.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#254743]">
                        {item.indicator.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatYear(item.observation.year)} ·{" "}
                        {periodLabel(
                          item.observation.period,
                          item.observation.quarter
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-[#0f5c58]">
                        {arabicNumber.format(asNumber(item.observation.value))}{" "}
                        {item.indicator.unit}
                      </span>
                      <Badge
                        className={`${observationStatusMeta[item.observation.verificationStatus].className} border-0`}
                      >
                        {
                          observationStatusMeta[
                            item.observation.verificationStatus
                          ].label
                        }
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyText text="لا توجد قياسات معتمدة ضمن نطاق الفلاتر الحالية." />
            )}
          </CardContent>
        </Card>
        <Card className="border-[#dce8e4] shadow-sm">
          <CardContent className="p-5 md:p-6">
            <h3 className="font-bold text-[#173f3d]">مرجع المنظومة</h3>
            <p className="mt-1 text-xs leading-6 text-slate-500">
              يربط التطبيق تعريف المؤشر، قياسه الدوري، مصدره، وحالة التحقق ضمن
              قاعدة بيانات موحدة.
            </p>
            <div className="mt-5 space-y-3">
              {(["اقتصادي", "اجتماعي", "بيئي"] as const).map(axis => (
                <div
                  className="flex items-center justify-between rounded-xl bg-[#f6f9f7] px-3 py-2.5"
                  key={axis}
                >
                  <Badge className={`${axisMeta[axis].className} border`}>
                    {axis}
                  </Badge>
                  <span className="text-xs text-slate-500">UNWTO / SDG</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function DashboardActivityMap({
  areas,
  year,
}: {
  areas: { name: string; type: string; count: number }[];
  year?: number;
}) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markerRefs = useRef<google.maps.Marker[]>([]);
  const geocodeCache = useRef<Map<string, google.maps.LatLngLiteral>>(
    new Map()
  );
  useEffect(() => {
    if (!map || !window.google) return;
    markerRefs.current = detachMapMarkers(
      markerRefs.current
    ) as google.maps.Marker[];
    const geocoder = new window.google.maps.Geocoder();
    let cancelled = false;
    areas.forEach((area, index) => {
      const draw = (position: google.maps.LatLngLiteral) => {
        if (cancelled) return;
        const marker = new window.google.maps.Marker({
          map,
          position,
          title: area.name,
          label: {
            text: String(index + 1),
            color: "#ffffff",
            fontWeight: "700",
          },
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 13,
            fillColor: index === 0 ? "#c58a3f" : "#0f766e",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });
        const info = new window.google.maps.InfoWindow({
          content: `<div dir="rtl" style="font-family:Arial;padding:5px 4px;min-width:150px"><strong>${area.name}</strong><br/><small>${area.type} · ${area.count} قياس معتمد</small></div>`,
        });
        marker.addListener("click", () => info.open({ map, anchor: marker }));
        markerRefs.current.push(marker);
      };
      const cached = geocodeCache.current.get(area.name);
      if (cached) {
        draw(cached);
        return;
      }
      geocoder.geocode(
        { address: `${area.name}، ليبيا` },
        (results, status) => {
          if (cancelled || status !== "OK" || !results?.[0]?.geometry?.location)
            return;
          const position = {
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
          };
          geocodeCache.current.set(area.name, position);
          draw(position);
        }
      );
    });
    return () => {
      cancelled = true;
      markerRefs.current = detachMapMarkers(
        markerRefs.current
      ) as google.maps.Marker[];
    };
  }, [areas, map]);
  return (
    <section className="overflow-hidden rounded-2xl border border-[#cfe2db] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-[#e4efeb] px-5 py-4">
        <div>
          <h2 className="font-bold text-[#173f3d]">خريطة النشاط الجغرافي</h2>
          <p className="mt-1 text-xs text-slate-500">
            عرض تفاعلي لأكثر المناطق نشاطاً في{" "}
            {year ? formatYear(year) : "أحدث سنة متاحة"}؛ انقر على العلامة لعرض
            التفاصيل.
          </p>
          <p className="mt-2 text-[11px] leading-5 text-amber-700">طبقة الحدود الإدارية الرسمية غير مفعلة حالياً؛ ستظهر فقط بعد اعتماد ملف هندسي موثق من المركز.</p>
        </div>
        <MapPinned className="h-5 w-5 text-[#b47730]" />
      </div>
      <MapView
        className="h-[360px]"
        initialCenter={{ lat: 26.3351, lng: 17.2283 }}
        initialZoom={5}
        onMapReady={setMap}
      />
    </section>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="grid h-72 place-items-center rounded-xl border border-dashed border-[#cfe0da] bg-[#f8fbf9] p-7 text-center text-sm leading-6 text-slate-500">
      {message}
    </div>
  );
}
function EmptyText({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-[#cfe0da] bg-[#f8fbf9] p-5 text-sm leading-7 text-slate-500">
      {text}
    </p>
  );
}
