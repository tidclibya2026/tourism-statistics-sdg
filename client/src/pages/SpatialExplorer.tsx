import { MapView } from "@/components/Map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Building2, ChevronLeft, Database, MapPinned, Map as MapIcon, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const numberFormat = new Intl.NumberFormat("ar-LY");
const all = "all";

export default function SpatialExplorer() {
  const [selectedYear, setSelectedYear] = useState(all);
  const [selectedIndicator, setSelectedIndicator] = useState(all);
  const [selectedArea, setSelectedArea] = useState(all);
  const [comparePrimary, setComparePrimary] = useState(all);
  const [compareSecondary, setCompareSecondary] = useState(all);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapFailure, setMapFailure] = useState(false);
  const markerRefs = useRef<google.maps.Marker[]>([]);

  const filters = useMemo(() => ({
    year: selectedYear === all ? undefined : Number(selectedYear),
    indicatorId: selectedIndicator === all ? undefined : Number(selectedIndicator),
    areaId: selectedArea === all ? undefined : Number(selectedArea),
  }), [selectedArea, selectedIndicator, selectedYear]);
  const { data, isLoading, isError } = trpc.spatial.overview.useQuery(filters);
  const comparisonFilters = useMemo(() => ({
    year: selectedYear === all ? undefined : Number(selectedYear),
    indicatorId: selectedIndicator === all ? undefined : Number(selectedIndicator),
  }), [selectedIndicator, selectedYear]);
  const { data: comparisonData } = trpc.spatial.overview.useQuery(comparisonFilters);

  useEffect(() => {
    if (!map || !data || !window.google) return;
    markerRefs.current.forEach((marker) => marker.setMap(null));
    markerRefs.current = [];
    const geocoder = new window.google.maps.Geocoder();
    const bounds = new window.google.maps.LatLngBounds();
    let cancelled = false;

    data.cities.forEach((city) => {
      geocoder.geocode({ address: `${city.name}، ليبيا` }, (results, status) => {
        if (cancelled || status !== "OK" || !results?.[0]?.geometry?.location) return;
        const cityRows = data.observations.filter((row) => row.areaId === city.id);
        const marker = new window.google.maps.Marker({
          map,
          position: results[0].geometry.location,
          title: city.name,
          label: { text: city.name.slice(0, 1), color: "#ffffff", fontWeight: "700" },
          icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 11, fillColor: cityRows.length ? "#b98238" : "#0f766e", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 },
        });
        const info = new window.google.maps.InfoWindow({
          content: `<div dir="rtl" style="font-family:Arial;padding:4px 2px"><strong>${city.name}</strong><br/><span>${city.parentName ?? ""}</span><br/><small>قياسات مكانية معتمدة: ${cityRows.length}</small></div>`,
        });
        marker.addListener("click", () => { info.open({ map, anchor: marker }); setSelectedArea(String(city.id)); });
        markerRefs.current.push(marker);
        bounds.extend(results[0].geometry.location);
        if (markerRefs.current.length === data.cities.length) map.fitBounds(bounds, 80);
      });
    });

    return () => { cancelled = true; markerRefs.current.forEach((marker) => marker.setMap(null)); };
  }, [data, map]);

  const currentAreaName = selectedArea === all ? "كل المواقع" : [...(data?.regions ?? []), ...(data?.cities ?? [])].find((area) => String(area.id) === selectedArea)?.name ?? "الموقع المختار";
  const primaryRow = comparisonData?.observations.find((row) => String(row.areaId) === comparePrimary);
  const secondaryRow = comparisonData?.observations.find((row) => String(row.areaId) === compareSecondary);
  const comparisonDifference = primaryRow && secondaryRow && primaryRow.unit === secondaryRow.unit ? primaryRow.value - secondaryRow.value : null;

  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-[2rem] bg-[#0d5b56] px-6 py-8 text-white shadow-[0_20px_55px_rgba(11,84,79,.18)] md:px-9">
      <div className="absolute -left-14 -top-14 h-52 w-52 rounded-full border-[28px] border-amber-300/15" />
      <div className="absolute bottom-0 left-1/3 h-24 w-72 rounded-t-full bg-teal-300/10" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl"><p className="text-xs font-bold tracking-[.14em] text-amber-200">الطبقة المكانية للمرصد</p><h1 className="mt-2 text-2xl font-bold md:text-3xl">الأقاليم والمدن السياحية</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-teal-50/90">نموذج مكاني مستقل يربط القياسات المعتمدة بمواقعها عند توفر المصدر الجغرافي. لا تُستكمل الفجوات مكانياً ولا تُعرض قيم غير موثقة.</p></div>
        <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-xs text-teal-50"><ShieldCheck className="h-5 w-5 text-amber-200" /><span>مرجع المواقع: تسمية جغرافية موثقة، والقياسات: معتمدة فقط</span></div>
      </div>
    </section>

    <section className="rounded-2xl border border-[#dce8e4] bg-white p-4 shadow-sm md:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-end"><div className="lg:w-56"><p className="mb-2 text-xs font-bold text-slate-600">السنة</p><Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger><SelectValue placeholder="كل السنوات" /></SelectTrigger><SelectContent><SelectItem value={all}>كل السنوات</SelectItem>{(data?.availableYears ?? []).map((year) => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}</SelectContent></Select></div><div className="lg:w-72"><p className="mb-2 text-xs font-bold text-slate-600">المؤشر</p><Select value={selectedIndicator} onValueChange={setSelectedIndicator}><SelectTrigger><SelectValue placeholder="كل المؤشرات" /></SelectTrigger><SelectContent><SelectItem value={all}>كل المؤشرات المنشورة</SelectItem>{(data?.indicators ?? []).map((indicator) => <SelectItem key={indicator.id} value={String(indicator.id)}>{indicator.name}</SelectItem>)}</SelectContent></Select></div><div className="lg:w-64"><p className="mb-2 text-xs font-bold text-slate-600">الموقع</p><Select value={selectedArea} onValueChange={setSelectedArea}><SelectTrigger><SelectValue placeholder="كل المواقع" /></SelectTrigger><SelectContent><SelectItem value={all}>كل الأقاليم والمدن</SelectItem><SelectItem value="group-regions" disabled>الأقاليم المرجعية</SelectItem>{(data?.regions ?? []).map((area) => <SelectItem key={area.id} value={String(area.id)}>{area.name}</SelectItem>)}<SelectItem value="group-cities" disabled>المدن المحورية</SelectItem>{(data?.cities ?? []).map((area) => <SelectItem key={area.id} value={String(area.id)}>{area.name}</SelectItem>)}</SelectContent></Select></div><Button variant="outline" className="h-10 border-[#cfe0dc] text-[#0d5b56]" onClick={() => { setSelectedYear(all); setSelectedIndicator(all); setSelectedArea(all); }}>إعادة الضبط</Button></div></section>

    {isLoading ? <section className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)}</section> : isError ? <Card className="border-rose-200 bg-rose-50"><CardContent className="p-6 text-sm text-rose-700">تعذر تحميل النموذج المكاني حالياً. يرجى إعادة المحاولة.</CardContent></Card> : <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={MapIcon} label="الأقاليم المرجعية" value={numberFormat.format(data?.summary.regions ?? 0)} tone="teal" /><Metric icon={Building2} label="المدن المحورية" value={numberFormat.format(data?.summary.cities ?? 0)} tone="amber" /><Metric icon={Database} label="قياسات مكانية معتمدة" value={numberFormat.format(data?.summary.approvedObservations ?? 0)} tone="blue" /><Metric icon={MapPinned} label="نطاق العرض" value={currentAreaName} tone="slate" compact /></section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]"><article className="overflow-hidden rounded-2xl border border-[#dce8e4] bg-white shadow-sm"><div className="flex items-center justify-between border-b border-[#e5eeeb] px-5 py-4"><div><h2 className="font-bold text-[#153c39]">الخريطة التفاعلية</h2><p className="mt-1 text-xs text-slate-500">انقر على المدينة لعرض موقعها وحالة القياسات المكانية المعتمدة.</p></div><Badge className="border-0 bg-[#e7f2ee] text-[#0f766e]">مدن مرجعية</Badge></div>{mapFailure ? <SpatialMapFallback cities={data?.cities ?? []} onSelect={(id) => setSelectedArea(String(id))} /> : <MapView className="h-[430px]" initialCenter={{ lat: 26.3351, lng: 17.2283 }} initialZoom={5} onMapReady={setMap} onMapError={() => setMapFailure(true)} />}</article>
      <aside className="rounded-2xl border border-[#dce8e4] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-bold text-[#153c39]">دليل المواقع</h2><p className="mt-1 text-xs text-slate-500">مرجع جاهز لإسناد القياسات القادمة.</p></div><MapPinned className="h-5 w-5 text-[#b98238]" /></div><div className="mt-4 space-y-3">{(data?.regions ?? []).map((region) => <div key={region.id} className="rounded-xl border border-[#e3ece9] bg-[#fbfdfc] p-3"><p className="font-semibold text-[#173f3c]">{region.name}</p><div className="mt-2 flex flex-wrap gap-1.5">{(data?.cities ?? []).filter((city) => city.parentId === region.id).map((city) => <button key={city.id} onClick={() => setSelectedArea(String(city.id))} className="rounded-full bg-[#e9f4f1] px-2.5 py-1 text-[11px] font-semibold text-[#0f766e] transition hover:bg-[#d6ebe5]">{city.name}<ChevronLeft className="mr-1 inline h-3 w-3" /></button>)}</div></div>)}</div><div className="mt-5 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3 text-xs leading-6 text-amber-900">لم تُدخل قياسات مكانية معتمدة بعد. أضف قياساً مرتبطاً بمدينة أو إقليم من المصدر الرسمي ليظهر في الخريطة والمقارنة.</div></aside></section>

      <section className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]"><article className="rounded-2xl border border-[#cfe3dc] bg-[#f7fbf9] p-5 shadow-sm"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e8f3ee] text-[#0f766e]"><GitCompareIcon /></span><div><h2 className="font-bold text-[#153c39]">مقارنة موقعين</h2><p className="mt-1 text-xs text-slate-500">تستخدم السنة والمؤشر المحددين أعلاه وتعرض قياسات معتمدة فقط.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Select value={comparePrimary} onValueChange={setComparePrimary}><SelectTrigger><SelectValue placeholder="الموقع الأول" /></SelectTrigger><SelectContent><SelectItem value={all}>اختر الموقع الأول</SelectItem>{(comparisonData?.cities ?? []).map((city) => <SelectItem key={city.id} value={String(city.id)}>{city.name}</SelectItem>)}</SelectContent></Select><Select value={compareSecondary} onValueChange={setCompareSecondary}><SelectTrigger><SelectValue placeholder="الموقع الثاني" /></SelectTrigger><SelectContent><SelectItem value={all}>اختر الموقع الثاني</SelectItem>{(comparisonData?.cities ?? []).filter((city) => String(city.id) !== comparePrimary).map((city) => <SelectItem key={city.id} value={String(city.id)}>{city.name}</SelectItem>)}</SelectContent></Select></div>{selectedYear === all || selectedIndicator === all ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900">حدّد سنةً ومؤشراً أولاً لإجراء مقارنة مكانية قابلة للقراءة.</p> : comparePrimary === all || compareSecondary === all ? <p className="mt-4 text-xs text-slate-500">اختر مدينتين لإظهار المقارنة.</p> : primaryRow && secondaryRow ? <div className="mt-4 grid gap-2 sm:grid-cols-3"><ComparisonValue label={primaryRow.areaName} value={`${numberFormat.format(primaryRow.value)} ${primaryRow.unit}`} /><ComparisonValue label="الفرق" value={`${numberFormat.format(Math.abs(comparisonDifference ?? 0))} ${primaryRow.unit}`} highlight /><ComparisonValue label={secondaryRow.areaName} value={`${numberFormat.format(secondaryRow.value)} ${secondaryRow.unit}`} /></div> : <p className="mt-4 rounded-xl border border-dashed border-[#bedad1] bg-white px-3 py-2 text-xs leading-6 text-slate-600">لا تتوافر بعد قياسات معتمدة مطابقة للموقعين ضمن نطاق المقارنة المحدد.</p>}</article><article className="rounded-2xl border border-[#dce8e4] bg-white shadow-sm"><div className="flex flex-col gap-1 border-b border-[#e5eeeb] px-5 py-4 md:flex-row md:items-center md:justify-between"><div><h2 className="font-bold text-[#153c39]">القياسات المكانية المعتمدة</h2><p className="mt-1 text-xs text-slate-500">يعرض الجدول فقط القياسات السنوية المعتمدة المرتبطة بموقع محدد.</p></div><Badge variant="outline" className="w-fit border-[#b8d6ce] text-[#0f766e]">{numberFormat.format(data?.observations.length ?? 0)} سجل</Badge></div>{(data?.observations.length ?? 0) === 0 ? <div className="p-9 text-center"><MapPinned className="mx-auto h-9 w-9 text-[#91b7ad]" /><p className="mt-3 font-semibold text-[#173f3c]">السجل المكاني جاهز لاستقبال البيانات المعتمدة</p><p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500">يتم الاحتفاظ بالأقاليم والمدن كفهرس مكاني فقط حتى تُربط بها قياسات موثقة من مصدر رسمي؛ لذلك لا توجد أرقام معروضة حالياً.</p></div> : <div className="overflow-auto"><table className="w-full min-w-[760px] text-right text-sm"><thead className="bg-[#f6faf8] text-xs text-slate-500"><tr><th className="px-5 py-3">الموقع</th><th className="px-5 py-3">الإقليم</th><th className="px-5 py-3">المؤشر</th><th className="px-5 py-3">السنة</th><th className="px-5 py-3">القيمة</th><th className="px-5 py-3">المصدر</th></tr></thead><tbody>{data?.observations.map((row) => <tr key={row.id} className="border-t border-[#edf2f0]"><td className="px-5 py-3 font-semibold text-[#173f3c]">{row.areaName}</td><td className="px-5 py-3 text-slate-600">{row.parentName ?? "—"}</td><td className="px-5 py-3 text-slate-600">{row.indicatorName}</td><td className="px-5 py-3 text-slate-600">{row.year}</td><td className="px-5 py-3 font-bold text-[#0f766e]">{numberFormat.format(row.value)} {row.unit}</td><td className="max-w-64 truncate px-5 py-3 text-xs text-slate-500">{row.source ?? "—"}</td></tr>)}</tbody></table></div>}</article></section>
    </>}
  </div>;
}

function Metric({ icon: Icon, label, value, tone, compact = false }: { icon: typeof MapIcon; label: string; value: string; tone: "teal" | "amber" | "blue" | "slate"; compact?: boolean }) {
  const tones = { teal: "bg-teal-50 text-[#0f766e]", amber: "bg-amber-50 text-[#b26d1e]", blue: "bg-sky-50 text-sky-700", slate: "bg-slate-100 text-slate-600" };
  return <Card className="border-[#dce8e4] shadow-sm"><CardContent className="flex items-center gap-3 p-4"><span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span><div className="min-w-0"><p className="text-xs text-slate-500">{label}</p><p className={`mt-1 font-bold text-[#173f3c] ${compact ? "truncate text-base" : "text-2xl"}`}>{value}</p></div></CardContent></Card>;
}

function SpatialMapFallback({ cities, onSelect }: { cities: { id: number; name: string; parentName: string | null }[]; onSelect: (id: number) => void }) {
  const positions: Record<string, string> = { "طرابلس": "right-[16%] top-[23%]", "بنغازي": "right-[47%] top-[28%]", "سبها": "right-[36%] top-[66%]" };
  return <div className="relative h-[430px] overflow-hidden bg-[radial-gradient(circle_at_80%_20%,rgba(79,180,172,.25),transparent_24%),linear-gradient(145deg,#f0f7f4,#deece7)]"><div className="absolute inset-x-0 top-[20%] h-20 border-y border-dashed border-[#c0dcd4]/80 bg-white/30" /><div className="absolute left-[7%] top-[8%] rounded-full border border-[#c4ddd5] bg-white/70 px-3 py-1.5 text-xs font-bold text-[#0f766e]">عرض مرجعي بديل</div><div className="absolute left-[9%] top-[38%] text-[11px] text-slate-500">البحر المتوسط</div><div className="absolute inset-x-[14%] bottom-[12%] h-24 rounded-[55%_45%_50%_50%] border border-[#c7ddd7] bg-[#eaf3f0] opacity-70" />{cities.map((city) => <button key={city.id} onClick={() => onSelect(city.id)} className={`absolute ${positions[city.name] ?? "right-1/2 top-1/2"} group -translate-x-1/2 -translate-y-1/2 text-center`}><span className="mx-auto grid h-11 w-11 place-items-center rounded-full border-4 border-white bg-[#b98238] text-sm font-bold text-white shadow-[0_8px_20px_rgba(92,63,25,.24)] transition group-hover:scale-110">{city.name.slice(0, 1)}</span><span className="mt-2 block rounded-lg bg-white/90 px-2 py-1 text-xs font-bold text-[#173f3c] shadow-sm">{city.name}</span><span className="mt-1 block text-[10px] text-slate-500">{city.parentName}</span></button>)}<div className="absolute bottom-5 left-5 max-w-xs rounded-xl border border-[#d2e4de] bg-white/85 p-3 text-xs leading-6 text-slate-600">تعذر الاتصال بخدمة الخرائط في بيئة العرض؛ يظل دليل المدن قابلاً للتفاعل ولا يحل محل خريطة حدود إدارية معتمدة.</div></div>;
}

function GitCompareIcon() { return <ChevronLeft className="h-5 w-5 rotate-180" />; }

function ComparisonValue({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) { return <div className={`rounded-xl p-3 text-center ${highlight ? "bg-[#0f766e] text-white" : "border border-[#dce8e4] bg-white text-[#173f3c]"}`}><p className={`text-[11px] ${highlight ? "text-teal-100" : "text-slate-500"}`}>{label}</p><p className="mt-1 text-sm font-bold">{value}</p></div>; }
