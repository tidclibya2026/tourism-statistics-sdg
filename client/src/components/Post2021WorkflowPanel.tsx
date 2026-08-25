import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BadgeCheck, ClipboardPenLine, FileCheck2 } from "lucide-react";

const numberFormat = new Intl.NumberFormat("ar-LY");

type Role = "admin" | "analyst" | "viewer";

export function Post2021WorkflowPanel({ role, draftCount, reviewableCount, reviewedCount, note, pending, onNoteChange, onReview, onApprove }: {
  role: Role;
  draftCount: number;
  reviewableCount: number;
  reviewedCount: number;
  note: string;
  pending: boolean;
  onNoteChange: (value: string) => void;
  onReview: () => void;
  onApprove: () => void;
}) {
  return <section className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-100 text-sky-700"><ClipboardPenLine className="h-4 w-4" /></span><h2 className="font-bold text-sky-950">مسودات المدن السنوية بعد 2021</h2></div><p className="mt-2 text-xs leading-6 text-sky-900/85">النطاق: مدينة نشطة، فترة سنوية، وسنة 2022 أو أحدث. لا تشمل هذه الواجهة قياسات ربع سنوية أو بيانات قبل 2022.</p></div><div className="flex gap-2"><Badge className="border-0 bg-amber-100 text-amber-900">{numberFormat.format(draftCount)} مسودات</Badge><Badge className="border-0 bg-emerald-100 text-emerald-800">{numberFormat.format(reviewedCount)} جاهزة للاعتماد</Badge></div></div>{role === "viewer" ? <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs text-sky-900">تتطلب المراجعة دور محلل مستقل، بينما يبقى الاعتماد النهائي مقصوراً على المسؤول.</p> : <div className="mt-4 flex flex-col gap-3 rounded-xl border border-sky-200 bg-white/80 p-3"><Textarea value={note} onChange={(event) => onNoteChange(event.target.value)} className="min-h-16 text-xs" placeholder="ملاحظة المراجعة أو الاعتماد لهذه الدفعة (اختيارية)" /><div className="flex flex-wrap gap-2">{reviewableCount > 0 && <AlertDialog><AlertDialogTrigger asChild><Button size="sm" variant="outline" disabled={pending} className="border-sky-300 text-sky-800"><FileCheck2 className="ml-1.5 h-3.5 w-3.5" />مراجعة {numberFormat.format(reviewableCount)} مسودات مؤهلة</Button></AlertDialogTrigger><AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>تأكيد المراجعة المستقلة لمسودات ما بعد 2021</AlertDialogTitle><AlertDialogDescription>سيُنقل فقط {numberFormat.format(reviewableCount)} قياساً سنوياً لمدن من سنة 2022 أو أحدث إلى حالة «مراجعة مكتملة». تستبعد العملية تلقائياً القياسات التي أدخلتها أنت بنفسك.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction asChild><Button disabled={pending} className="bg-[#0f766e] hover:bg-[#0a5f58]" onClick={onReview}>تأكيد المراجعة المستقلة</Button></AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}{role === "admin" && reviewedCount > 0 && <AlertDialog><AlertDialogTrigger asChild><Button size="sm" disabled={pending} className="bg-[#0f766e] hover:bg-[#0a5f58]"><BadgeCheck className="ml-1.5 h-3.5 w-3.5" />اعتماد {numberFormat.format(reviewedCount)} قياسات</Button></AlertDialogTrigger><AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>تأكيد اعتماد المسؤول لقياسات المدن بعد 2021</AlertDialogTitle><AlertDialogDescription>سيُنقل فقط {numberFormat.format(reviewedCount)} قياسات سنوية اكتملت مراجعتها المستقلة إلى حالة «معتمد للنشر» لتظهر في الخريطة وواجهات البيانات والتصدير.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction asChild><Button disabled={pending} className="bg-[#0f766e] hover:bg-[#0a5f58]" onClick={onApprove}>تأكيد الاعتماد والنشر</Button></AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}{reviewableCount === 0 && reviewedCount === 0 && <p className="text-xs leading-6 text-slate-600">لا توجد حالياً مسودات مؤهلة للمراجعة أو قياسات مراجعَة بانتظار الاعتماد ضمن هذا النطاق.</p>}</div></div>}</section>;
}
