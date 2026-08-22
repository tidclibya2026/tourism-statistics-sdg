import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle2, ClipboardCheck, CloudUpload, Database, Globe2, Layers3, MapPinned, PauseCircle, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const numberFormat = new Intl.NumberFormat("ar-LY");
const destinationIcons = { visit_libya: Globe2, libya_atlas: MapPinned } as const;
const statusLabels = { draft: "مسودة داخلية", ready: "جاهز للربط", paused: "متوقف مؤقتاً" } as const;
const statusStyles = { draft: "bg-slate-100 text-slate-700", ready: "bg-emerald-50 text-emerald-700", paused: "bg-amber-50 text-amber-700" } as const;
const feedPaths = {
  visit_libya: "/api/publication/v1/visit_libya",
  libya_atlas: "/api/publication/v1/libya_atlas",
} as const;

export default function PublicationHub() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data, isLoading, isError } = trpc.publication.hub.useQuery();
  const updateStatus = trpc.publication.updateStatus.useMutation({
    onSuccess: () => { utils.publication.hub.invalidate(); toast.success("تم تحديث حالة الجاهزية دون إرسال أي بيانات خارجية."); },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) return <div className="grid gap-5"><Skeleton className="h-48 rounded-[2rem]" /><div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)}</div></div>;
  if (isError || !data) return <Card className="border-rose-200 bg-rose-50"><CardContent className="p-6 text-sm text-rose-700">تعذر تحميل مركز النشر. يرجى إعادة المحاولة.</CardContent></Card>;

  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-[2rem] bg-[#163f54] px-6 py-8 text-white shadow-[0_20px_55px_rgba(17,63,83,.18)] md:px-9"><div className="absolute -left-14 -bottom-24 h-64 w-64 rounded-full border-[30px] border-sky-300/15" /><div className="absolute right-1/3 top-0 h-full w-px bg-white/10" /><div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-3xl"><p className="text-xs font-bold tracking-[.14em] text-amber-200">بوابة النشر المؤسسي</p><h1 className="mt-2 text-2xl font-bold md:text-3xl">حزم البيانات الموحدة</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-sky-50/90">إعداد منضبط لعرض بيانات المرصد في Visit Libya وأطلس ليبيا من مصدر موحد، مع فصل مرحلة الجاهزية التقنية عن الإرسال الفعلي إلى المنصات الخارجية.</p></div><div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-xs text-sky-50"><ShieldCheck className="h-5 w-5 text-amber-200" /><span>تُضمّن القياسات المعتمدة فقط</span></div></div></section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={Database} label="قياسات وطنية معتمدة" value={numberFormat.format(data.summary.nationalApproved)} tone="teal" /><Metric icon={MapPinned} label="قياسات مكانية معتمدة" value={numberFormat.format(data.summary.spatialApproved)} tone="blue" /><Metric icon={Layers3} label="مواقع جاهزة للفهرسة" value={numberFormat.format(data.summary.activeSpatialAreas)} tone="amber" /><Metric icon={ClipboardCheck} label="أحدث سنة وطنية" value={data.summary.latestYear ? String(data.summary.latestYear) : "—"} tone="slate" /></section>

    <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><article className="rounded-2xl border border-[#dce8e4] bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e8f4f1] text-[#0f766e]"><Send className="h-5 w-5" /></span><div><h2 className="font-bold text-[#153c39]">عقد حزمة البيانات</h2><p className="mt-1 text-xs text-slate-500">إصدار {data.contract.version} — {data.contract.status}</p></div></div><div className="mt-5 rounded-xl bg-[#f7faf9] p-4 text-sm leading-7 text-slate-600"><p><strong className="text-[#173f3c]">الوصول:</strong> {data.contract.access}</p><p className="mt-2"><strong className="text-[#173f3c]">قاعدة الجودة:</strong> {data.contract.qualityRule}</p></div><div className="mt-4 flex flex-wrap gap-2">{data.contract.fields.map((field) => <code key={field} className="rounded-lg border border-[#d9e8e3] bg-white px-2 py-1 text-[11px] text-[#0f766e]">{field}</code>)}</div></article><article className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm"><div className="flex items-center gap-2 text-amber-900"><AlertTriangle className="h-5 w-5" /><h2 className="font-bold">ضابط النشر</h2></div><p className="mt-3 text-sm leading-7 text-amber-900/80">هذه الشاشة تجهز الحزمة ولا ترسلها إلى Visit Libya أو أطلس ليبيا. يلزم تحديد عنوان الاستقبال وبيانات المصادقة لكل منصة ثم مراجعة نطاق الحقول قبل تفعيل التكامل الفعلي.</p><div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> لا تدخل البيانات غير المعتمدة في الحزمة.</div></article></section>

    <section className="grid gap-5 md:grid-cols-2">{data.destinations.map((destination) => { const Icon = destinationIcons[destination.code]; const canManage = user?.role === "admin"; const nextStatus = destination.status === "ready" ? "paused" : "ready"; return <article key={destination.id} className="rounded-2xl border border-[#dce8e4] bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf4f6] text-[#176579]"><Icon className="h-6 w-6" /></span><div><h2 className="font-bold text-[#153c39]">{destination.name}</h2><p className="mt-1 text-xs text-slate-500">وضع التسليم: واجهة بيانات تعاقدية</p></div></div><Badge className={`border-0 ${statusStyles[destination.status]}`}>{statusLabels[destination.status]}</Badge></div><p className="mt-5 min-h-14 text-sm leading-7 text-slate-600">{destination.description}</p><div className="mt-4 rounded-xl border border-[#dce8e4] bg-[#f8fbfa] p-3"><p className="text-[11px] font-bold text-[#60736e]">واجهة الاستهلاك العامة (GET)</p><code dir="ltr" className="mt-2 block break-all text-[10px] leading-5 text-[#0f766e]">{feedPaths[destination.code]}</code><p className="mt-2 text-[11px] leading-5 text-slate-500">تعيد السجلات المعتمدة فقط عندما تكون الحالة «جاهز للربط»، وتعطي قائمة فارغة في غير ذلك.</p></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf2f0] pt-4"><div className="flex items-center gap-2 text-xs text-slate-500"><CloudUpload className="h-4 w-4" />لا يوجد إرسال خارجي مفعّل</div>{canManage ? <Button disabled={updateStatus.isPending} variant="outline" className="border-[#b9d7cf] text-[#0d5b56]" onClick={() => updateStatus.mutate({ id: destination.id, status: nextStatus })}>{destination.status === "ready" ? <><PauseCircle className="ml-2 h-4 w-4" />إيقاف الجاهزية</> : <><CheckCircle2 className="ml-2 h-4 w-4" />تجهيز للربط</>}</Button> : <span className="text-xs text-slate-500">يتطلب تغيير الحالة صلاحية مسؤول</span>}</div></article>; })}</section>
  </div>;
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof Database; label: string; value: string; tone: "teal" | "blue" | "amber" | "slate" }) {
  const tones = { teal: "bg-teal-50 text-[#0f766e]", blue: "bg-sky-50 text-sky-700", amber: "bg-amber-50 text-[#b26d1e]", slate: "bg-slate-100 text-slate-600" };
  return <Card className="border-[#dce8e4] shadow-sm"><CardContent className="flex items-center gap-3 p-4"><span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span><div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-[#173f3c]">{value}</p></div></CardContent></Card>;
}
