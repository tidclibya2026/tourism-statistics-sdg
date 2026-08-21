import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import QueryStateError from "@/components/QueryStateError";
import { axisMeta, indicatorStatusMeta } from "@/lib/tourism";
import { trpc } from "@/lib/trpc";
import { Edit3, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type IndicatorForm = { code: string; name: string; description: string; axis: "اقتصادي" | "اجتماعي" | "بيئي"; framework: "UNWTO" | "SDG"; sdgReference: "SDG 8" | "SDG 11" | "SDG 12" | "SDG 14" | "SDG 17" | ""; unit: string; calculationMethod: string; officialSource: string; status: "draft" | "published" | "archived" };
const emptyForm: IndicatorForm = { code: "", name: "", description: "", axis: "اقتصادي", framework: "UNWTO", sdgReference: "", unit: "", calculationMethod: "", officialSource: "", status: "draft" };

export default function Indicators() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [axis, setAxis] = useState<"الكل" | IndicatorForm["axis"]>("الكل");
  const [form, setForm] = useState<IndicatorForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const canManage = user?.role === "admin";
  const query = trpc.indicators.list.useQuery(axis === "الكل" ? undefined : { axis });
  const create = trpc.indicators.create.useMutation({ onSuccess: () => { toast.success("تم إنشاء المؤشر بنجاح."); utils.indicators.list.invalidate(); resetForm(); }, onError: (error) => toast.error(error.message) });
  const update = trpc.indicators.update.useMutation({ onSuccess: () => { toast.success("تم تحديث المؤشر."); utils.indicators.list.invalidate(); resetForm(); }, onError: (error) => toast.error(error.message) });
  const remove = trpc.indicators.delete.useMutation({ onSuccess: () => { toast.success("تم حذف المؤشر."); utils.indicators.list.invalidate(); }, onError: (error) => toast.error(error.message) });
  const filtered = useMemo(() => (query.data ?? []).filter((item) => `${item.code} ${item.name}`.toLowerCase().includes(search.toLowerCase())), [query.data, search]);

  function resetForm() { setForm(emptyForm); setEditingId(null); }
  function edit(item: NonNullable<typeof query.data>[number]) { setEditingId(item.id); setForm({ code: item.code, name: item.name, description: item.description ?? "", axis: item.axis, framework: item.framework, sdgReference: item.sdgReference ?? "", unit: item.unit, calculationMethod: item.calculationMethod ?? "", officialSource: item.officialSource ?? "", status: item.status }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canManage) return;
    if (form.framework === "SDG" && !form.sdgReference) { toast.error("يرجى اختيار مرجع SDG للمؤشر."); return; }
    const payload = { ...form, sdgReference: form.sdgReference || null, description: form.description || undefined, calculationMethod: form.calculationMethod || undefined, officialSource: form.officialSource || undefined };
    if (editingId) update.mutate({ id: editingId, ...payload }); else create.mutate(payload);
  }

  return <div className="space-y-6">
    <section><h1 className="page-title">إدارة المؤشرات السياحية</h1><p className="page-subtitle">تعريف المؤشرات وفق المحور المرجعي والإطار الدولي ووحدة القياس ومنهجية الاحتساب.</p></section>
    {query.isError && <QueryStateError message="تعذر تحميل سجل المؤشرات." onRetry={() => query.refetch()} />}
    {canManage ? <form onSubmit={submit} className="section-card p-5 md:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold text-[#173f3d]">{editingId ? "تعديل المؤشر" : "إضافة مؤشر جديد"}</h2><p className="mt-1 text-xs text-slate-500">تُحفظ المؤشرات كتعريفات مستقلة عن قياساتها السنوية والربع سنوية.</p></div>{editingId && <Button type="button" variant="outline" size="sm" onClick={resetForm}><X className="ml-1 h-4 w-4" />إلغاء التعديل</Button>}</div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Field label="رمز المؤشر"><Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="ARR-001" /></Field>
      <Field label="اسم المؤشر"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="إجمالي الوافدين الدوليين" /></Field>
      <Field label="المحور"><Select value={form.axis} onValueChange={(value: IndicatorForm["axis"]) => setForm({ ...form, axis: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="اقتصادي">اقتصادي</SelectItem><SelectItem value="اجتماعي">اجتماعي</SelectItem><SelectItem value="بيئي">بيئي</SelectItem></SelectContent></Select></Field>
      <Field label="الإطار المرجعي"><Select value={form.framework} onValueChange={(value: IndicatorForm["framework"]) => setForm({ ...form, framework: value, sdgReference: value === "UNWTO" ? "" : form.sdgReference })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="UNWTO">UNWTO</SelectItem><SelectItem value="SDG">SDG</SelectItem></SelectContent></Select></Field>
      <Field label="مرجع SDG"><Select value={form.sdgReference || "none"} onValueChange={(value) => setForm({ ...form, sdgReference: value === "none" ? "" : value as IndicatorForm["sdgReference"] })} disabled={form.framework !== "SDG"}><SelectTrigger><SelectValue placeholder="اختياري لـ UNWTO" /></SelectTrigger><SelectContent><SelectItem value="none">غير منطبق</SelectItem>{["SDG 8", "SDG 11", "SDG 12", "SDG 14", "SDG 17"].map((sdg) => <SelectItem key={sdg} value={sdg}>{sdg}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="وحدة القياس"><Input required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="عدد، نسبة مئوية، دينار" /></Field>
      <Field label="حالة النشر"><Select value={form.status} onValueChange={(value: IndicatorForm["status"]) => setForm({ ...form, status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">مسودة</SelectItem><SelectItem value="published">منشور</SelectItem><SelectItem value="archived">مؤرشف</SelectItem></SelectContent></Select></Field>
      <Field label="المصدر الرسمي"><Input value={form.officialSource} onChange={(e) => setForm({ ...form, officialSource: e.target.value })} placeholder="الجهة/النظام المصدر" /></Field>
      <Field label="وصف المؤشر" className="md:col-span-2"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="ما الذي يقيسه المؤشر؟" /></Field>
      <Field label="طريقة الاحتساب" className="md:col-span-2"><Textarea value={form.calculationMethod} onChange={(e) => setForm({ ...form, calculationMethod: e.target.value })} placeholder="المعادلة، النطاق، والافتراضات المنهجية" /></Field>
    </div><Button type="submit" className="mt-5 h-10 bg-[#0f5c58] hover:bg-[#0a4845]" disabled={create.isPending || update.isPending}>{editingId ? <Edit3 className="ml-1.5 h-4 w-4" /> : <Plus className="ml-1.5 h-4 w-4" />}{editingId ? "حفظ التعديلات" : "إضافة المؤشر"}</Button></form> : <AccessHint text="يمكنك استعراض تعريفات المؤشرات، بينما تقتصر الإضافة والتعديل والحذف على دور admin." />}

    <section className="table-shell"><div className="flex flex-col gap-3 border-b border-[#e8efec] p-4 md:flex-row md:items-center md:justify-between"><div><h2 className="font-bold text-[#173f3d]">سجل المؤشرات</h2><p className="mt-1 text-xs text-slate-500">{filtered.length} مؤشر مطابق للفلاتر الحالية</p></div><div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="w-full pr-9 sm:w-56" placeholder="بحث بالاسم أو الرمز" value={search} onChange={(e) => setSearch(e.target.value)} /></div><Select value={axis} onValueChange={(value: "الكل" | IndicatorForm["axis"]) => setAxis(value)}><SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="الكل">كل المحاور</SelectItem><SelectItem value="اقتصادي">اقتصادي</SelectItem><SelectItem value="اجتماعي">اجتماعي</SelectItem><SelectItem value="بيئي">بيئي</SelectItem></SelectContent></Select></div></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-right text-sm"><thead className="bg-[#f6f9f7] text-xs text-slate-500"><tr><th className="px-5 py-3 font-semibold">المؤشر</th><th className="px-4 py-3 font-semibold">المحور</th><th className="px-4 py-3 font-semibold">المرجع</th><th className="px-4 py-3 font-semibold">الوحدة</th><th className="px-4 py-3 font-semibold">الحالة</th>{canManage && <th className="px-4 py-3 font-semibold">إجراء</th>}</tr></thead><tbody className="divide-y divide-[#edf2ef]">{query.isLoading ? <tr><td colSpan={6} className="p-8 text-center text-slate-500">جارٍ تحميل المؤشرات…</td></tr> : filtered.length ? filtered.map((item) => <tr key={item.id} className="transition hover:bg-[#fbfdfc]"><td className="px-5 py-3.5"><p className="font-semibold text-[#244844]">{item.name}</p><p className="mt-0.5 font-mono text-xs text-slate-500" dir="ltr">{item.code}</p></td><td className="px-4 py-3.5"><Badge className={`${axisMeta[item.axis].className} border`}>{item.axis}</Badge></td><td className="px-4 py-3.5"><span className="font-medium text-[#315c56]">{item.framework}</span>{item.sdgReference && <span className="mr-1 text-xs text-slate-500">· {item.sdgReference}</span>}</td><td className="px-4 py-3.5 text-slate-600">{item.unit}</td><td className="px-4 py-3.5"><Badge variant="outline" className="border-[#d8e5e0] text-slate-600">{indicatorStatusMeta[item.status]}</Badge></td>{canManage && <td className="px-4 py-3.5"><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => edit(item)} aria-label="تعديل"><Edit3 className="h-4 w-4 text-[#0f5c58]" /></Button><Button variant="ghost" size="icon" onClick={() => { if (window.confirm(`حذف المؤشر ${item.name} وجميع قياساته؟`)) remove.mutate({ id: item.id }); }} aria-label="حذف"><Trash2 className="h-4 w-4 text-rose-600" /></Button></div></td>}</tr>) : <tr><td colSpan={6} className="p-10 text-center text-slate-500">لا توجد مؤشرات مطابقة. {canManage ? "أضف أول مؤشر من النموذج أعلاه." : ""}</td></tr>}</tbody></table></div></section>
  </div>;
}
function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) { return <label className={className}><span className="field-label">{label}</span>{children}</label>; }
function AccessHint({ text }: { text: string }) { return <div className="rounded-2xl border border-[#cfe0da] bg-[#edf7f3] px-5 py-4 text-sm leading-7 text-[#23574e]">{text}</div>; }
