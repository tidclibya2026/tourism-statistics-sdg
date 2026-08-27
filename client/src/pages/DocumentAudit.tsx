import { FileCheck2, FileDown, FileKey2, FolderArchive, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

const actionLabels = {
  document_download: "تنزيل وثيقة",
  documentation_zip_export: "تصدير حزمة الوثائق",
  report_signed: "توقيع تقرير",
  pki_signature_attempt: "محاولة توقيع PKI",
} as const;
const outcomeLabels = { success: "ناجحة", denied: "مرفوضة", failed: "فاشلة" } as const;

function ActionIcon({ action }: { action: keyof typeof actionLabels }) {
  const Icon = action === "report_signed" ? FileCheck2 : action === "documentation_zip_export" ? FolderArchive : action === "pki_signature_attempt" ? FileKey2 : FileDown;
  return <Icon className="h-4 w-4" />;
}

export default function DocumentAudit() {
  const audit = trpc.documentAudit.list.useQuery({ limit: 500 }, { retry: false, refetchOnWindowFocus: false });
  const rows = audit.data ?? [];
  return <main dir="rtl" className="space-y-6">
    <section className="overflow-hidden rounded-[2rem] bg-[#173f3d] p-6 text-white shadow-[0_22px_60px_rgba(23,63,61,.18)] md:p-8"><div className="flex items-start gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#d9a357] text-[#173f3d]"><ShieldAlert className="h-6 w-6" /></span><div><p className="text-xs font-bold tracking-[.15em] text-amber-200">حوكمة الوثائق والإصدارات</p><h1 className="mt-2 text-3xl font-bold">سجل تدقيق الوثائق والتوقيعات</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-teal-50/85">سجل مركزي دائم لعمليات تنزيل الأدلة وتصدير حزمة الوثائق وتوقيع التقارير ومحاولات التكامل المؤسسي، متاح للمسؤولين المخولين فقط.</p></div></div></section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Card className="border-[#dce8e4] p-4"><p className="text-sm text-slate-500">إجمالي الأحداث</p><p className="mt-2 text-3xl font-bold text-[#173f3d]">{rows.length}</p></Card><Card className="border-[#dce8e4] p-4"><p className="text-sm text-slate-500">توقيعات ناجحة</p><p className="mt-2 text-3xl font-bold text-[#0f766e]">{rows.filter((row) => row.action === "report_signed" && row.outcome === "success").length}</p></Card><Card className="border-[#dce8e4] p-4"><p className="text-sm text-slate-500">تنزيلات الأدلة</p><p className="mt-2 text-3xl font-bold text-[#8b5d24]">{rows.filter((row) => row.action === "document_download").length}</p></Card><Card className="border-[#dce8e4] p-4"><p className="text-sm text-slate-500">إخفاقات أو رفض</p><p className="mt-2 text-3xl font-bold text-rose-700">{rows.filter((row) => row.outcome !== "success").length}</p></Card></section>
    <section className="section-card overflow-x-auto p-4 md:p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-[#173f3d]">الأحداث الأخيرة</h2><p className="mt-1 text-sm text-slate-500">البيانات مرتبة من الأحدث إلى الأقدم، ولا تعرض أسرار التوقيع.</p></div><Badge variant="outline" className="border-[#cfe3dc] text-[#0f766e]">{audit.isLoading ? "جارٍ التحميل…" : `${rows.length} حدث`}</Badge></div><table className="w-full min-w-[760px] text-right text-sm"><thead><tr className="border-b border-[#dce8e4] text-slate-500"><th className="p-3">العملية</th><th className="p-3">النتيجة</th><th className="p-3">المورد</th><th className="p-3">المنفذ</th><th className="p-3">التاريخ</th><th className="p-3">التفاصيل</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-[#edf3f0] align-top"><td className="p-3"><span className="flex items-center gap-2 font-semibold text-[#173f3d]"><ActionIcon action={row.action} />{actionLabels[row.action]}</span></td><td className="p-3"><Badge className={row.outcome === "success" ? "border-0 bg-[#e6f4ee] text-[#146c52]" : "border-0 bg-[#fdeaea] text-rose-700"}>{outcomeLabels[row.outcome]}</Badge></td><td className="max-w-[220px] break-words p-3 text-slate-700">{row.resource}</td><td className="p-3 text-slate-600">{row.actorName || row.actorEmail || "حساب غير متاح"}</td><td className="whitespace-nowrap p-3 text-slate-600">{new Date(row.createdAt).toLocaleString("ar-LY")}</td><td className="max-w-[260px] break-words p-3 text-xs text-slate-500">{row.details || "—"}</td></tr>)}{!audit.isLoading && !rows.length && <tr><td colSpan={6} className="p-10 text-center text-slate-500">لا توجد أحداث مسجلة بعد.</td></tr>}</tbody></table></section>
  </main>;
}
