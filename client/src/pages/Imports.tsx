import { useAuth } from "@/_core/hooks/useAuth";
import QueryStateError from "@/components/QueryStateError";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { importTemplateUrl } from "@/lib/importTemplate";
import { trpc } from "@/lib/trpc";
import { CalendarPlus, Download, FileUp, FileWarning, MapPinned, ShieldCheck, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type ParsedRow = Record<string, unknown>;
type ImportMode = "standard" | "city";
const none = "none";
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
  const [importMode, setImportMode] = useState<ImportMode>("standard");
  const [cityEntry, setCityEntry] = useState({ cityId: none, indicatorId: none, year: "2022", value: "", source: "", notes: "" });
  const canImport = user?.role === "admin" || user?.role === "analyst";
  const history = trpc.imports.history.useQuery();
  const entryOptions = trpc.spatial.entryOptions.useQuery(undefined, { enabled: canImport });
  const utils = trpc.useUtils();
  const process = trpc.imports.process.useMutation({
    onSuccess: (result) => {
      setIssues(result.issues);
      toast.success(`اكتمل الاستيراد: ${result.acceptedRows} صف مقبول و${result.rejectedRows} صف مرفوض.`);
      utils.imports.history.invalidate();
      utils.observations.list.invalidate();
      utils.dashboard.summary.invalidate();
      utils.spatial.overview.invalidate();
      utils.spatial.cityRankings.invalidate();
      utils.spatial.cityTrend.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const processCityTemplate = trpc.imports.processCityTemplate.useMutation({
    onSuccess: (result) => {
      setIssues(result.issues);
      toast.success(`اكتمل فحص نموذج المدن: ${result.acceptedRows} مسودة جاهزة للمراجعة و${result.rejectedRows} صف مرفوض.`);
      if (result.ignoredRows) toast.message(`${result.ignoredRows} صفاً فارغاً في النموذج لم يُرسل للاستيراد.`);
      utils.imports.history.invalidate();
      utils.spatial.management.invalidate();
      utils.spatial.overview.invalidate();
      utils.spatial.cityRankings.invalidate();
      utils.spatial.cityTrend.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const saveCityEntry = trpc.spatial.upsertObservation.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ قياس المدينة كمسودة موثقة بانتظار المراجعة المستقلة.");
      setCityEntry({ cityId: none, indicatorId: none, year: "2022", value: "", source: "", notes: "" });
      utils.spatial.management.invalidate();
      utils.spatial.overview.invalidate();
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
      const citySheet = workbook.Sheets["طلب البيانات"];
      const imported = citySheet
        ? XLSX.utils.sheet_to_json<ParsedRow>(citySheet, { defval: "" })
        : XLSX.utils.sheet_to_json<ParsedRow>(workbook.Sheets[workbook.SheetNames[0]], { defval: "" }).map(normalizeRow);
      if (!imported.length) {
        toast.error("الملف لا يحتوي على صفوف بيانات قابلة للقراءة.");
        return;
      }
      setFile(selected);
      setRows(imported);
      setImportMode(citySheet ? "city" : "standard");
      setIssues([]);
      toast.success(citySheet ? `تم التعرف على نموذج المدن وقراءة ${imported.length} صفاً. املأ الصفوف المطلوبة فقط ثم ابدأ التحقق.` : `تمت قراءة ${imported.length} صفاً. راجع المعاينة ثم ابدأ التحقق.`);
    } catch {
      toast.error("تعذر قراءة الملف. تأكد من تنسيق Excel أو CSV.");
    }
  }

  function startImport() {
    if (!file || !rows.length) return;
    if (importMode === "city") {
      processCityTemplate.mutate({ fileName: file.name, rows });
      return;
    }
    process.mutate({ fileName: file.name, fileType: file.name.toLowerCase().endsWith(".csv") ? "CSV" : "Excel", rows });
  }

  const previewColumns = importMode === "city"
    ? ["رمز المدينة", "المدينة", "المؤشر المطلوب", "السنة المقدمة", "القيمة المقدمة", "المصدر الرسمي / اسم التقرير"]
    : ["code", "year", "period", "quarter", "value", "targetValue"];
  const citySubmissionRows = rows.filter((row) => ["السنة المقدمة", "القيمة المقدمة", "المصدر الرسمي / اسم التقرير", "رقم الجدول أو الصفحة", "رقم المرجع أو الرابط"].some((key) => String(row[key] ?? "").trim() !== "")).length;
  const isPending = process.isPending || processCityTemplate.isPending;
  const selectedIndicator = entryOptions.data?.indicators.find((indicator) => String(indicator.id) === cityEntry.indicatorId);
  const quickEntryPending = saveCityEntry.isPending || entryOptions.isLoading;

  function saveQuickCityEntry() {
    if (cityEntry.cityId === none || cityEntry.indicatorId === none || !cityEntry.value || !cityEntry.source.trim() || !cityEntry.notes.trim()) {
      toast.error("أكمل المدينة والمؤشر والقيمة والمصدر ورقم الجدول أو الصفحة.");
      return;
    }
    const year = Number(cityEntry.year);
    if (!Number.isInteger(year) || year < 2022) {
      toast.error("هذا النموذج مخصص لسنوات ما بعد 2021 وسنوات مدنية كاملة فقط.");
      return;
    }
    saveCityEntry.mutate({ spatialAreaId: Number(cityEntry.cityId), indicatorId: Number(cityEntry.indicatorId), year, period: "annual", quarter: "annual", value: Number(cityEntry.value), source: cityEntry.source.trim(), notes: cityEntry.notes.trim() });
  }

  return <div className="space-y-6">
    <section><h1 className="page-title">استيراد البيانات</h1><p className="page-subtitle">استيراد القياسات من ملفات Excel أو CSV فقط، مع تحقق على مستوى كل صف وتقرير أخطاء واضح.</p></section>
    {history.isError && <QueryStateError message="تعذر تحميل سجل عمليات الاستيراد." onRetry={() => history.refetch()} />}

    {!canImport ? <div className="rounded-2xl border border-[#cfe0da] bg-[#edf7f3] px-5 py-4 text-sm leading-7 text-[#23574e]">دور viewer لا يتيح استيراد البيانات. يمكن الرجوع إلى التقارير للاطلاع على النتائج المنشورة.</div> : <section className="grid gap-5 xl:grid-cols-[1fr_.85fr]">
      <div className="section-card p-5 md:p-6">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e6f1ee] text-[#0f5c58]"><UploadCloud className="h-5 w-5" /></span><div><h2 className="font-bold text-[#173f3d]">رفع ملف قياسات</h2><p className="mt-1 text-xs text-slate-500">يدعم ملف القياسات الوطني المعتاد أو نموذج Excel الخاص بالمدن السياحية.</p></div></div>
        <div className="mt-5 rounded-2xl border border-[#cfe0da] bg-[#f4faf7] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold text-[#173f3d]">ابدأ بالقالب الرسمي</h3><p className="mt-1 text-xs leading-6 text-slate-600">نزّل القالب، املأ ورقة «البيانات» فقط، ثم ارفعه هنا دون تغيير عناوين الأعمدة.</p></div><a href={importTemplateUrl} download className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0f5c58] px-3 text-sm font-bold text-white transition hover:bg-[#0a4845]"><Download className="h-4 w-4" />تنزيل قالب Excel</a></div></div>
        <input ref={inputRef} className="hidden" type="file" accept=".xlsx,.xls,.csv" onChange={(event) => selectFile(event.target.files?.[0])} />
        <button type="button" onClick={() => inputRef.current?.click()} className="mt-5 grid w-full place-items-center rounded-2xl border-2 border-dashed border-[#b8d8cc] bg-[#f7fbf9] px-5 py-9 text-center transition hover:border-[#0f5c58] hover:bg-[#f0f8f5]"><FileUp className="mb-3 h-7 w-7 text-[#0f5c58]" /><span className="font-bold text-[#28514b]">اختر ملف Excel أو CSV</span><span className="mt-1 text-xs text-slate-500">لا تُقبل أي صيغ أخرى.</span></button>
        {file && <div className="mt-4 rounded-xl bg-[#f5f9f7] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-[#244844]">{file.name}</p><Badge className={importMode === "city" ? "border-0 bg-amber-100 text-amber-900" : "border-0 bg-[#e6f1ee] text-[#0f5c58]"}>{importMode === "city" ? "نموذج المدن السياحية" : "قياسات عامة"}</Badge></div>{importMode === "city" ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-950"><span className="flex items-center gap-1.5 font-bold"><MapPinned className="h-4 w-4" />{citySubmissionRows} صفاً يحوي قيماً مقدمة</span><p className="mt-1">لا ينشئ هذا المسار قياسات منشورة؛ كل صف صحيح يصبح مسودة موثقة ثم يمر بمراجعة محلل مستقل واعتماد المسؤول.</p></div> : <p className="mt-1 text-xs text-slate-500">{rows.length} صف جاهز للتحقق والاستيراد.</p>}<Button className="mt-4 bg-[#0f5c58] hover:bg-[#0a4845]" onClick={startImport} disabled={isPending || (importMode === "city" && citySubmissionRows === 0)}>{importMode === "city" ? <><ShieldCheck className="ml-2 h-4 w-4" />فحص وإنشاء مسودات المدن</> : "بدء التحقق والاستيراد"}</Button></div>}
      </div>
      <div className="section-card p-5 md:p-6"><div className="flex items-center gap-2"><FileWarning className="h-5 w-5 text-[#b47730]" /><h2 className="font-bold text-[#173f3d]">قواعد التحقق</h2></div><div className="mt-4 space-y-3 text-sm leading-6 text-slate-600"><p>في نموذج المدن: لا تقبل إلا سنة مدنية كاملة مع رمز مدينة ومؤشر ووحدة مطابقة للمؤشر المنشور.</p><p>يلزم اسم التقرير الرسمي ورقم الجدول أو الصفحة ورقم المرجع أو الرابط؛ ولا تقبل القيم التقديرية أو الأصفار البديلة.</p><p>كل قياس مدني مستورد ينشأ <strong>مسودة</strong> فقط، ولا يظهر في الخريطة إلا بعد المراجعة المستقلة والاعتماد.</p><p>يبقى الاستيراد العام داعماً للحقول <span dir="ltr" className="font-mono text-xs">code, year, period, quarter, value</span> وفق قواعده الحالية.</p></div></div>
    </section>}

    {canImport && <section className="rounded-2xl border border-[#b9d7cf] bg-gradient-to-l from-[#effaf6] to-white p-5 shadow-sm"><div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#dcefe8] text-[#0f766e]"><CalendarPlus className="h-5 w-5" /></span><div><h2 className="font-bold text-[#173f3d]">إدخال قياس مدينة بعد 2021</h2><p className="mt-1 text-xs leading-6 text-slate-600">أدخل قياساً سنوياً موثقاً مباشرة. يُحفظ كمسودة ولا يظهر في الخريطة إلا بعد المراجعة المستقلة واعتماد المسؤول.</p></div></div><div className="mt-5 grid gap-4 md:grid-cols-3"><div><Label>المدينة</Label><Select value={cityEntry.cityId} onValueChange={(cityId) => setCityEntry((form) => ({ ...form, cityId }))}><SelectTrigger className="mt-2"><SelectValue placeholder="اختر المدينة" /></SelectTrigger><SelectContent><SelectItem value={none}>اختر المدينة</SelectItem>{entryOptions.data?.cities.map((city) => <SelectItem key={city.id} value={String(city.id)}>{city.name}</SelectItem>)}</SelectContent></Select></div><div><Label>المؤشر ووحدة القياس</Label><Select value={cityEntry.indicatorId} onValueChange={(indicatorId) => setCityEntry((form) => ({ ...form, indicatorId }))}><SelectTrigger className="mt-2"><SelectValue placeholder="اختر المؤشر" /></SelectTrigger><SelectContent><SelectItem value={none}>اختر المؤشر</SelectItem>{entryOptions.data?.indicators.map((indicator) => <SelectItem key={indicator.id} value={String(indicator.id)}>{indicator.name} — {indicator.unit}</SelectItem>)}</SelectContent></Select></div><div><Label>السنة المدنية المكتملة</Label><Input className="mt-2" type="number" min="2022" max="2100" value={cityEntry.year} onChange={(event) => setCityEntry((form) => ({ ...form, year: event.target.value }))} /></div><div><Label>القيمة {selectedIndicator ? `(${selectedIndicator.unit})` : ""}</Label><Input className="mt-2" type="number" step="any" value={cityEntry.value} onChange={(event) => setCityEntry((form) => ({ ...form, value: event.target.value }))} placeholder="القيمة الرسمية" /></div><div className="md:col-span-2"><Label>المصدر الرسمي</Label><Input className="mt-2" value={cityEntry.source} onChange={(event) => setCityEntry((form) => ({ ...form, source: event.target.value }))} placeholder="اسم التقرير أو الجهة الرسمية" /></div><div className="md:col-span-2"><Label>رقم الجدول أو الصفحة والمرجع</Label><Input className="mt-2" value={cityEntry.notes} onChange={(event) => setCityEntry((form) => ({ ...form, notes: event.target.value }))} placeholder="مثال: جدول 4، صفحة 27 — رابط أو رقم مرجع" /></div><div className="flex items-end"><Button className="w-full bg-[#0f5c58] hover:bg-[#0a4845]" onClick={saveQuickCityEntry} disabled={quickEntryPending}><ShieldCheck className="ml-2 h-4 w-4" />حفظ مسودة المدينة</Button></div></div></section>}

    {rows.length > 0 && <section className="table-shell"><div className="border-b border-[#e8efec] p-4"><h2 className="font-bold text-[#173f3d]">معاينة الملف</h2><p className="mt-1 text-xs text-slate-500">أول خمسة صفوف من الملف قبل إرساله للخادم.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-right text-sm"><thead className="bg-[#f6f9f7] text-xs text-slate-500"><tr>{previewColumns.map((column) => <th className="px-4 py-3" key={column} dir={importMode === "city" ? "rtl" : "ltr"}>{column}</th>)}</tr></thead><tbody className="divide-y divide-[#edf2ef]">{rows.slice(0, 5).map((row, index) => <tr key={index}>{previewColumns.map((column) => <td className="px-4 py-3 text-slate-600" key={column}>{String(row[column] ?? "—")}</td>)}</tr>)}</tbody></table></div></section>}
    {issues.length > 0 && <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5"><h2 className="font-bold text-rose-800">تقرير أخطاء التحقق</h2><div className="mt-3 max-h-64 space-y-2 overflow-y-auto">{issues.map((issue, index) => <div className="rounded-lg bg-white/75 px-3 py-2 text-sm text-rose-800" key={`${issue.rowNumber}-${index}`}>الصف {issue.rowNumber}{issue.field ? ` · ${issue.field}` : ""}: {issue.message}</div>)}</div></section>}
    <section className="table-shell"><div className="border-b border-[#e8efec] p-4"><h2 className="font-bold text-[#173f3d]">سجل عمليات الاستيراد</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-right text-sm"><thead className="bg-[#f6f9f7] text-xs text-slate-500"><tr><th className="px-5 py-3">الملف</th><th className="px-4 py-3">الصيغة</th><th className="px-4 py-3">المقبول</th><th className="px-4 py-3">المرفوض</th><th className="px-4 py-3">الحالة</th></tr></thead><tbody className="divide-y divide-[#edf2ef]">{history.data?.length ? history.data.map((job) => <tr key={job.id}><td className="px-5 py-3.5 font-medium text-[#244844]">{job.fileName}</td><td className="px-4 py-3.5" dir="ltr">{job.fileType}</td><td className="px-4 py-3.5 text-emerald-700">{job.acceptedRows}</td><td className="px-4 py-3.5 text-rose-700">{job.rejectedRows}</td><td className="px-4 py-3.5"><Badge variant="outline">{job.status === "completed" ? "مكتمل" : job.status === "completed_with_errors" ? "مكتمل مع أخطاء" : job.status}</Badge></td></tr>) : <tr><td colSpan={5} className="p-8 text-center text-slate-500">لا توجد عمليات استيراد بعد.</td></tr>}</tbody></table></div></section>
  </div>;
}
