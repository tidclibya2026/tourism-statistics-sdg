import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import QueryStateError from "@/components/QueryStateError";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Clock3, FileSearch, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

function severityBadge(count: number, label: string, tone: string) {
  return <div className="rounded-xl border border-[#dce8e4] bg-white p-3 shadow-sm"><p className="text-xs text-slate-500">{label}</p><p className={`mt-1 text-2xl font-bold ${tone}`}>{count}</p></div>;
}

export default function SecurityReview() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const capabilities = trpc.auth.administrativeCapabilities.useQuery(undefined, { enabled: user?.role === "admin", retry: false });
  const reviews = trpc.security.dependencyReviews.useQuery(undefined, { enabled: capabilities.data?.canReviewSecurity === true, retry: false });
  const run = trpc.security.runDependencyReview.useMutation({
    onSuccess: () => {
      toast.success("اكتمل تقرير مراجعة التبعيات دون تعديل أي مكتبة.");
      utils.security.dependencyReviews.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  if (user?.role !== "admin") return <div className="rounded-2xl border border-[#cfe0da] bg-[#edf7f3] px-5 py-4 text-sm leading-7 text-[#23574e]">هذه الصفحة متاحة للمسؤول المفوّض بمراجعة الأمان فقط.</div>;
  if (capabilities.isLoading) return <div className="rounded-2xl border border-[#cfe0da] bg-white p-6 text-sm text-slate-500">جارٍ التحقق من تفويض مراجعة الأمان…</div>;
  if (!capabilities.data?.canReviewSecurity) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm leading-7 text-amber-900">لا يحمل هذا الحساب تفويض مراجعة الأمان. يمنح مالك المنصة هذه القدرة من صفحة المستخدمين والصلاحيات.</div>;

  const latest = reviews.data?.[0];
  return <div className="space-y-6">
    <section className="flex flex-col gap-4 rounded-2xl bg-[linear-gradient(135deg,#0f5c58,#164943)] p-6 text-white shadow-[0_18px_40px_rgba(15,92,88,.18)] md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15"><ShieldCheck className="h-6 w-6" /></span><div><h1 className="text-xl font-bold">مراجعة أمان التبعيات</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-teal-50/85">تقرأ هذه المراجعة الحزم الإنتاجية المباشرة وتنتج تقرير تنبيهات فقط داخل بيئة الاختبار. لا تثبّت تحديثات، ولا تعدل شجرة الحزم، ولا تنشر أي تغيير إلى البيئة الحية.</p></div></div>
      <Button onClick={() => run.mutate()} disabled={run.isPending} className="h-11 bg-[#d9a357] px-5 font-bold text-[#173f3d] hover:bg-[#edb96d]">{run.isPending ? "جارٍ إنشاء التقرير…" : "تشغيل تقرير آمن"}</Button>
    </section>

    {reviews.isError ? <QueryStateError message="تعذر تحميل تقارير مراجعة التبعيات." onRetry={() => reviews.refetch()} /> : <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{severityBadge(latest?.criticalCount ?? 0, "حرج", "text-rose-700")}{severityBadge(latest?.highCount ?? 0, "عالٍ", "text-orange-700")}{severityBadge(latest?.moderateCount ?? 0, "متوسط", "text-amber-700")}{severityBadge(latest?.lowCount ?? 0, "منخفض", "text-emerald-700")}</section>
      <section className="rounded-2xl border border-[#cfe0da] bg-[#f4faf7] p-5"><div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#a66a10]" /><div><h2 className="font-bold text-[#173f3d]">حدود التقرير المقصودة</h2><p className="mt-1 text-sm leading-7 text-slate-600">النتيجة ليست موافقة على التحديث. أي معالجة لاحقة تتطلب فحص التغيير واختباره في نسخة اختبار مستقلة ثم موافقة بشرية للترقية. لا يستخدم هذا المسار أوامر update أو audit fix.</p></div></div></section>
      <section className="table-shell"><div className="flex items-center gap-3 border-b border-[#e8efec] p-4"><FileSearch className="h-5 w-5 text-[#0f5c58]" /><div><h2 className="font-bold text-[#173f3d]">سجل التقارير</h2><p className="mt-1 text-xs text-slate-500">آخر 20 تقريراً، بلا تخزين لأجسام الاستجابة أو أسرار البيئة.</p></div></div><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-right text-sm"><thead className="bg-[#f6f9f7] text-xs text-slate-500"><tr><th className="px-5 py-3">التوقيت</th><th className="px-4 py-3">المشغّل</th><th className="px-4 py-3">الحالة</th><th className="px-4 py-3">النتيجة</th><th className="px-4 py-3">الملخص</th></tr></thead><tbody className="divide-y divide-[#edf2ef]">{reviews.isLoading ? <tr><td colSpan={5} className="p-8 text-center text-slate-500">جارٍ تحميل السجل…</td></tr> : reviews.data?.length ? reviews.data.map((review) => <tr key={review.id}><td className="px-5 py-3.5 text-slate-600"><span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{new Date(review.startedAt).toLocaleString("ar-LY")}</span></td><td className="px-4 py-3.5">{review.trigger === "manual" ? "يدوي" : "دوري"}</td><td className="px-4 py-3.5"><Badge className={review.status === "completed" ? "border-0 bg-emerald-100 text-emerald-800" : "border-0 bg-rose-100 text-rose-800"}>{review.status === "completed" ? "مكتمل" : "فشل"}</Badge></td><td className="px-4 py-3.5 text-xs text-slate-600">حرج {review.criticalCount} · عالٍ {review.highCount} · متوسط {review.moderateCount} · منخفض {review.lowCount}</td><td className="max-w-lg px-4 py-3.5 leading-6 text-slate-600">{review.summary}</td></tr>) : <tr><td colSpan={5} className="p-8 text-center text-slate-500">لا يوجد تقرير بعد. يشغّل التقرير داخل بيئة الاختبار بعد إعدادها.</td></tr>}</tbody></table></div></section>
    </>}
  </div>;
}
