import { useAuth } from "@/_core/hooks/useAuth";
import QueryStateError from "@/components/QueryStateError";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { importTemplateUrl } from "@/lib/importTemplate";
import { trpc } from "@/lib/trpc";
import { Download, FileUp, FileWarning, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type ParsedRow = Record<string, unknown>;
const columnAliases: Record<string, string> = {
  "رمز المؤشر": "code", code: "code", "السنة": "year", year: "year", "الفترة": "period", period: "period",
  "الربع": "quarter", quarter: "quarter", "القيمة": "value", value: "value", "القيمة المستهدفة": "targetValue",
  targetvalue: "targetValue", "المصدر": "source", source: "source", "ملاحظات": "notes", notes: "notes",
};

function normalizeRow(row: ParsedRow): ParsedRow {
  return Object.entries(row).reduce<ParsedRow>((normalized, [key, value]) => {
    normalized[columnAliases[key.trim().toLowerCase()] ?? key] = value;
    return normalized;
  }, {});
}

export default function Imports() {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [issues, setIssues] = useState<{ rowNumber: number; field?: string; message: string; severity: "error" | "warning" }[]>([]);
  const canImport = user?.role === "admin" || user?.role === "analyst";
  const history = trpc.imports.history.useQuery();
  const utils = trpc.useUtils();
  const process = trpc.imports.process.useMutation({
    onSuccess: (result) => {
      setIssues(result.issues);
      toast.success(`اكتمل الاستيراد: ${result.acceptedRows} صف مقبول و${result.rejectedRows} صف مرفوض.`);
      utils.imports.history.invalidate();
      utils.observations.list.invalidate();
      utils.dashboard.summary.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  async function selectFile(selected?: File) {
    if (!selected) return;
    const extension = selected.name.split(".").pop()?.toLowerCase();
    if (!extension || !["xlsx", "xls", "csv"].includes(extension)) {
      toast.error("الامتدادات المسموح بها هي Excel وCSV فقط.");
      return;
    }
    try {
      const workbook = XLSX.read(await selected.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const imported = XLSX.utils.sheet_to_json<ParsedRow>(firstSheet, { defval: "" }).map(normalizeRow);
      if (!imported.length) {
        toast.error("الملف لا يحتوي على صفوف بيانات قابلة للقراءة.");
        return;
      }
      setFile(selected);
      setRows(imported);
      setIssues([]);
      toast.success(`تمت قراءة ${imported.length} صفاً. راجع المعاينة ثم ابدأ التحقق.`);
    } catch {
      toast.error("تعذر قراءة الملف. تأكد من تنسيق Excel أو CSV.");
    }
  }

  function startImport() {
    if (!file || !rows.length) return;
    process.mutate({ fileName: file.name, fileType: file.name.toLowerCase().endsWith(".csv") ? "CSV" : "Excel", rows });
  }

  return <div className="space-y-6">
    <section><h1 className="page-title">استيراد البيانات</h1><p className="page-subtitle">استيراد القياسات من ملفات Excel أو CSV فقط، مع تحقق على مستوى كل صف وتقرير أخطاء واضح.</p></section>
    {history.isError && <QueryStateError message="تعذر تحميل سجل عمليات الاستيراد." onRetry={() => history.refetch()} />}

    {!canImport ? <div className="rounded-2xl border border-[#cfe0da] bg-[#edf7f3] px-5 py-4 text-sm leading-7 text-[#23574e]">دور viewer لا يتيح استيراد البيانات. يمكن الرجوع إلى التقارير للاطلاع على النتائج المنشورة.</div> : <section className="grid gap-5 xl:grid-cols-[1fr_.85fr]">
      <div className="section-card p-5 md:p-6">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e6f1ee] text-[#0f5c58]"><UploadCloud className="h-5 w-5" /></span><div><h2 className="font-bold text-[#173f3d]">رفع ملف قياسات</h2><p className="mt-1 text-xs text-slate-500">الحقول المدعومة: code، year، period، quarter، value، targetValue، source، notes.</p></div></div>
        <div className="mt-5 rounded-2xl border border-[#cfe0da] bg-[#f4faf7] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold text-[#173f3d]">ابدأ بالقالب الرسمي</h3><p className="mt-1 text-xs leading-6 text-slate-600">نزّل القالب، املأ ورقة «البيانات» فقط، ثم ارفعه هنا دون تغيير عناوين الأعمدة.</p></div><a href={importTemplateUrl} download className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0f5c58] px-3 text-sm font-bold text-white transition hover:bg-[#0a4845]"><Download className="h-4 w-4" />تنزيل قالب Excel</a></div></div>
        <input ref={inputRef} className="hidden" type="file" accept=".xlsx,.xls,.csv" onChange={(event) => selectFile(event.target.files?.[0])} />
        <button type="button" onClick={() => inputRef.current?.click()} className="mt-5 grid w-full place-items-center rounded-2xl border-2 border-dashed border-[#b8d8cc] bg-[#f7fbf9] px-5 py-9 text-center transition hover:border-[#0f5c58] hover:bg-[#f0f8f5]"><FileUp className="mb-3 h-7 w-7 text-[#0f5c58]" /><span className="font-bold text-[#28514b]">اختر ملف Excel أو CSV</span><span className="mt-1 text-xs text-slate-500">لا تُقبل أي صيغ أخرى.</span></button>
        {file && <div className="mt-4 rounded-xl bg-[#f5f9f7] p-4"><p className="font-semibold text-[#244844]">{file.name}</p><p className="mt-1 text-xs text-slate-500">{rows.length} صف جاهز للتحقق والاستيراد.</p><Button className="mt-4 bg-[#0f5c58] hover:bg-[#0a4845]" onClick={startImport} disabled={process.isPending}>بدء التحقق والاستيراد</Button></div>}
      </div>
      <div className="section-card p-5 md:p-6"><div className="flex items-center gap-2"><FileWarning className="h-5 w-5 text-[#b47730]" /><h2 className="font-bold text-[#173f3d]">قواعد التحقق</h2></div><div className="mt-4 space-y-3 text-sm leading-6 text-slate-600"><p>يجب أن يطابق <span dir="ltr" className="font-mono text-xs">code</span> رمز مؤشر موجوداً في المنظومة.</p><p>تقبل الفترة القيمتين <span dir="ltr" className="font-mono text-xs">annual</span> و<span dir="ltr" className="font-mono text-xs">quarterly</span> فقط.</p><p>يتطلب الإدخال الربع سنوي تحديد <span dir="ltr" className="font-mono text-xs">Q1–Q4</span>، وتُرفض الصفوف المكررة داخل الملف.</p><p>تحتوي ورقة «إرشادات» في القالب على وصف الحقول وقواعد تعبئتها.</p></div></div>
    </section>}

    {rows.length > 0 && <section className="table-shell"><div className="border-b border-[#e8efec] p-4"><h2 className="font-bold text-[#173f3d]">معاينة الملف</h2><p className="mt-1 text-xs text-slate-500">أول خمسة صفوف من الملف قبل إرساله للخادم.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-right text-sm"><thead className="bg-[#f6f9f7] text-xs text-slate-500"><tr>{["code", "year", "period", "quarter", "value", "targetValue"].map((column) => <th className="px-4 py-3" key={column} dir="ltr">{column}</th>)}</tr></thead><tbody className="divide-y divide-[#edf2ef]">{rows.slice(0, 5).map((row, index) => <tr key={index}>{["code", "year", "period", "quarter", "value", "targetValue"].map((column) => <td className="px-4 py-3 text-slate-600" key={column}>{String(row[column] ?? "—")}</td>)}</tr>)}</tbody></table></div></section>}
    {issues.length > 0 && <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5"><h2 className="font-bold text-rose-800">تقرير أخطاء التحقق</h2><div className="mt-3 max-h-64 space-y-2 overflow-y-auto">{issues.map((issue, index) => <div className="rounded-lg bg-white/75 px-3 py-2 text-sm text-rose-800" key={`${issue.rowNumber}-${index}`}>الصف {issue.rowNumber}{issue.field ? ` · ${issue.field}` : ""}: {issue.message}</div>)}</div></section>}
    <section className="table-shell"><div className="border-b border-[#e8efec] p-4"><h2 className="font-bold text-[#173f3d]">سجل عمليات الاستيراد</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-right text-sm"><thead className="bg-[#f6f9f7] text-xs text-slate-500"><tr><th className="px-5 py-3">الملف</th><th className="px-4 py-3">الصيغة</th><th className="px-4 py-3">المقبول</th><th className="px-4 py-3">المرفوض</th><th className="px-4 py-3">الحالة</th></tr></thead><tbody className="divide-y divide-[#edf2ef]">{history.data?.length ? history.data.map((job) => <tr key={job.id}><td className="px-5 py-3.5 font-medium text-[#244844]">{job.fileName}</td><td className="px-4 py-3.5" dir="ltr">{job.fileType}</td><td className="px-4 py-3.5 text-emerald-700">{job.acceptedRows}</td><td className="px-4 py-3.5 text-rose-700">{job.rejectedRows}</td><td className="px-4 py-3.5"><Badge variant="outline">{job.status === "completed" ? "مكتمل" : job.status === "completed_with_errors" ? "مكتمل مع أخطاء" : job.status}</Badge></td></tr>) : <tr><td colSpan={5} className="p-8 text-center text-slate-500">لا توجد عمليات استيراد بعد.</td></tr>}</tbody></table></div></section>
  </div>;
}

