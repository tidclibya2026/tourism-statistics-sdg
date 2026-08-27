import { AIChatBox, type Message } from "@/components/AIChatBox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportDashboardPdf } from "@/lib/dashboardPdf";
import { getSuggestedPrompts, suggestedPromptsByAxis } from "@/lib/dataAssistantPrompts";
import { trpc } from "@/lib/trpc";
import * as XLSX from "xlsx";
import { Database, Download, FileText, History, Loader2, Search, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type AssistantContext = { counts: { approvedNationalAnnualRows: number; approvedSpatialRows: number; calculatedForecastPoints: number }; axis: string; scope: string; sources: string[] };
type AssistantExchange = { id: number; question: string; answer: string; context: AssistantContext };
const historyStorageKey = "tidc-data-assistant-history-v1";
const selectedHistoryStorageKey = "tidc-data-assistant-selected-v1";
const historyFilterKeys = ["historyQuery", "historyAxis", "historyFrom", "historyTo", "historySource", "historySort"] as const;
function readHistoryFilter(key: (typeof historyFilterKeys)[number], fallback: string) { if (typeof window === "undefined") return fallback; return new URLSearchParams(window.location.search).get(key) ?? fallback; }

function readHistory(): AssistantExchange[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(historyStorageKey) ?? "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch { return []; }
}

function readSelectedHistoryIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(selectedHistoryStorageKey) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === "number") : [];
  } catch { return []; }
}

export function DataAssistantPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<AssistantExchange[]>(readHistory);
  const [activeExchange, setActiveExchange] = useState<AssistantExchange | null>(null);
  const [platformVersion, setPlatformVersion] = useState("غير متاح");
  const [exportedAt, setExportedAt] = useState("");
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<number[]>(readSelectedHistoryIds);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [axis, setAxis] = useState<"all" | "اقتصادي" | "اجتماعي" | "بيئي" | "سياحي">("all");
  const [scope, setScope] = useState<"all" | "national" | "spatial" | "forecast">("all");
  const [historyQuery, setHistoryQuery] = useState(() => readHistoryFilter("historyQuery", ""));
  const [historyAxis, setHistoryAxis] = useState<"all" | "اقتصادي" | "اجتماعي" | "بيئي" | "سياحي">(() => readHistoryFilter("historyAxis", "all") as "all" | "اقتصادي" | "اجتماعي" | "بيئي" | "سياحي");
  const [historyFrom, setHistoryFrom] = useState(() => readHistoryFilter("historyFrom", ""));
  const [historyTo, setHistoryTo] = useState(() => readHistoryFilter("historyTo", ""));
  const [historySource, setHistorySource] = useState(() => readHistoryFilter("historySource", ""));
  const [historySort, setHistorySort] = useState<"newest" | "oldest">(() => readHistoryFilter("historySort", "newest") as "newest" | "oldest");
  const [filterLinkCopied, setFilterLinkCopied] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const suggestedPrompts = useMemo(() => suggestedPromptsByAxis[axis], [axis]);
  const historySources = useMemo(() => Array.from(new Set(history.flatMap((item) => item.context.sources))).sort((a, b) => a.localeCompare(b, "ar")), [history]);
  const filteredHistory = useMemo(() => { const query = historyQuery.trim().toLocaleLowerCase("ar"); const from = historyFrom ? new Date(`${historyFrom}T00:00:00`).getTime() : null; const to = historyTo ? new Date(`${historyTo}T23:59:59.999`).getTime() : null; return history.filter((item) => { const searchable = [item.question, item.answer, item.context.axis, item.context.scope, ...item.context.sources].join(" ").toLocaleLowerCase("ar"); return (!query || searchable.includes(query)) && (historyAxis === "all" || item.context.axis === historyAxis) && (!historySource || item.context.sources.includes(historySource)) && (from === null || item.id >= from) && (to === null || item.id <= to); }).sort((a, b) => historySort === "newest" ? b.id - a.id : a.id - b.id); }, [history, historyQuery, historyAxis, historySource, historyFrom, historyTo, historySort]);
  const assistant = trpc.assistant.data.useMutation({
    onSuccess: (result, variables) => {
      const exchange: AssistantExchange = { id: Date.now(), question: variables.question, answer: result.answer, context: result.context };
      setMessages((current) => [...current, { role: "user", content: variables.question }, { role: "assistant", content: result.answer }]);
      setHistory((current) => [exchange, ...current.filter((item) => item.question !== exchange.question)].slice(0, 20));
      setActiveExchange(exchange);
    },
    onError: (error) => toast.error(error.message || "تعذر تشغيل المساعد الذكي."),
  });
  useEffect(() => { window.localStorage.setItem(historyStorageKey, JSON.stringify(history)); }, [history]);
  useEffect(() => { const validIds = new Set(history.map((item) => item.id)); setSelectedHistoryIds((current) => current.filter((id) => validIds.has(id))); }, [history]);
  useEffect(() => { window.localStorage.setItem(selectedHistoryStorageKey, JSON.stringify(selectedHistoryIds)); }, [selectedHistoryIds]);
  useEffect(() => { fetch("/__manus__/version.json", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((payload) => { if (payload?.version) setPlatformVersion(String(payload.version)); }).catch(() => undefined); }, []);
  useEffect(() => { const params = new URLSearchParams(window.location.search); const values: Record<string, string> = { historyQuery, historyAxis: historyAxis === "all" ? "" : historyAxis, historyFrom, historyTo, historySource, historySort: historySort === "newest" ? "" : historySort }; historyFilterKeys.forEach((key) => { if (values[key]) params.set(key, values[key]); else params.delete(key); }); const query = params.toString(); window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`); }, [historyQuery, historyAxis, historyFrom, historyTo, historySource, historySort]);

  function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || assistant.isPending) return;
    const chatHistory = messages.filter((message): message is Extract<Message, { role: "user" | "assistant" }> => message.role !== "system").slice(-6).map(({ role, content }) => ({ role, content }));
    assistant.mutate({ question: trimmed, history: chatHistory, axis: axis === "all" ? undefined : axis, scope });
  }

  async function exportActiveAnswer() {
    if (!activeExchange || !exportRef.current || isExporting) { if (!activeExchange) toast.info("أرسل سؤالاً أو اختر إجابة من السجل أولاً."); return; }
    setIsExporting(true); setExportProgress(20);
    try { setExportedAt(new Date().toLocaleString("ar-LY")); setExportProgress(55); await exportDashboardPdf(exportRef.current, `إجابة-مساعد-المرصد-${activeExchange.id}.pdf`); setExportProgress(100); toast.success("تم تجهيز إجابة المساعد مع مصادر البيانات للحفظ بصيغة PDF."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تجهيز ملف PDF."); }
    finally { setIsExporting(false); window.setTimeout(() => setExportProgress(0), 500); }
  }

  async function exportHistoryItems(items: AssistantExchange[], filePrefix: string) {
    if (!items.length || isExporting) { if (!items.length) toast.info("حدد محادثة واحدة على الأقل للتصدير."); return; }
    setIsExporting(true); setExportProgress(3);
    const root = document.createElement("div"); root.dir = "rtl"; root.style.cssText = "position:fixed;left:-10000px;top:0;width:900px;background:#fff;color:#173f3d;padding:32px;font-family:Arial,sans-serif;";
    const title = document.createElement("h1"); title.textContent = "سجل مساعد بيانات المرصد"; title.style.cssText = "margin:0 0 8px;font-size:24px";
    const meta = document.createElement("p"); meta.textContent = `تاريخ التصدير: ${new Date().toLocaleString("ar-LY")} · إصدار المنصة: ${platformVersion}`; meta.style.cssText = "margin:0 0 24px;color:#64748b;font-size:12px";
    root.append(title, meta);
    const orderedItems = items.slice().reverse();
    for (let index = 0; index < orderedItems.length; index += 1) {
      const item = orderedItems[index];
      const article = document.createElement("article"); article.style.cssText = "border-top:1px solid #dce8e4;padding:18px 0;"; const question = document.createElement("p"); question.textContent = `${index + 1}. السؤال: ${item.question}`; question.style.cssText = "font-weight:700;margin:0 0 8px"; const answer = document.createElement("div"); answer.textContent = item.answer; answer.style.cssText = "white-space:pre-wrap;line-height:1.8"; const details = document.createElement("p"); details.textContent = `المحور: ${item.context.axis} · النطاق: ${item.context.scope}\nالمصادر: ${item.context.sources.length ? item.context.sources.join("، ") : "لا يوجد مصدر نصي محدد"}`; details.style.cssText = "font-size:11px;color:#64748b;margin:12px 0 0;white-space:pre-wrap"; article.append(question, answer, details); root.append(article);
      setExportProgress(5 + Math.round(((index + 1) / orderedItems.length) * 72));
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }
    document.body.append(root); setExportProgress(85);
    try { await new Promise<void>((resolve) => window.setTimeout(resolve, 0)); await exportDashboardPdf(root, `${filePrefix}-${Date.now()}.pdf`); setExportProgress(100); toast.success(`تم تجهيز ${items.length} محادثة بصيغة PDF.`); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تجهيز سجل المحادثات."); } finally { root.remove(); setIsExporting(false); window.setTimeout(() => setExportProgress(0), 500); }
  }

  function exportAllHistory() { void exportHistoryItems(history, "سجل-مساعد-المرصد"); }
  function exportVisibleHistory() { void exportHistoryItems(filteredHistory, "نتائج-بحث-مساعد-المرصد"); }
  function exportSelectedHistory() { void exportHistoryItems(history.filter((item) => selectedHistoryIds.includes(item.id)), "محادثات-مساعد-المرصد"); }
  function exportVisibleExcel() {
    const items = filteredHistory;
    if (!items.length || isExporting) { if (!items.length) toast.info("لا توجد نتائج ظاهرة لتصديرها إلى Excel."); return; }
    setIsExporting(true); setExportProgress(10);
    try {
      const rows = items.map((item, index) => ({ "رقم المحادثة": index + 1, "التاريخ التقريبي": new Date(item.id).toLocaleString("ar-LY"), "السؤال": item.question, "الإجابة": item.answer, "المحور": item.context.axis, "النطاق": item.context.scope, "مصادر البيانات": item.context.sources.join("، ") || "لا يوجد مصدر نصي محدد", "القياسات الوطنية المعتمدة": item.context.counts.approvedNationalAnnualRows, "القياسات المكانية المعتمدة": item.context.counts.approvedSpatialRows, "نقاط التنبؤ المحسوبة": item.context.counts.calculatedForecastPoints }));
      const workbook = XLSX.utils.book_new(); const sheet = XLSX.utils.json_to_sheet(rows); sheet["!cols"] = [{ wch: 14 }, { wch: 22 }, { wch: 36 }, { wch: 80 }, { wch: 14 }, { wch: 16 }, { wch: 40 }, { wch: 18 }, { wch: 18 }, { wch: 18 }]; sheet["!rows"] = rows.map(() => ({ hpt: 72 })); Object.keys(sheet).filter((key) => !key.startsWith("!")).forEach((key) => { sheet[key].s = { alignment: { wrapText: true, vertical: "top" } }; }); XLSX.utils.book_append_sheet(workbook, sheet, "نتائج البحث");
      const sourceRows = items.flatMap((item, index) => (item.context.sources.length ? item.context.sources : ["لا يوجد مصدر نصي محدد"]).map((source) => ({ "رقم المحادثة": index + 1, "السؤال": item.question, "المحور": item.context.axis, "النطاق": item.context.scope, "مصدر البيانات": source, "القياسات الوطنية المعتمدة": item.context.counts.approvedNationalAnnualRows, "القياسات المكانية المعتمدة": item.context.counts.approvedSpatialRows, "نقاط التنبؤ المحسوبة": item.context.counts.calculatedForecastPoints }))); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sourceRows), "المصادر والإحصائيات");
      XLSX.writeFile(workbook, `نتائج-بحث-مساعد-المرصد-${Date.now()}.xlsx`); setExportProgress(100); toast.success(`تم تصدير ${items.length} نتيجة إلى Excel.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر إنشاء ملف Excel."); } finally { setIsExporting(false); window.setTimeout(() => setExportProgress(0), 500); }
  }
  function exportSelectedExcel() {
    const items = history.filter((item) => selectedHistoryIds.includes(item.id));
    if (!items.length || isExporting) { if (!items.length) toast.info("حدد محادثة واحدة على الأقل لتصديرها إلى Excel."); return; }
    setIsExporting(true); setExportProgress(10);
    try {
      const rows = items.map((item, index) => ({ "رقم المحادثة": index + 1, "التاريخ التقريبي": new Date(item.id).toLocaleString("ar-LY"), "السؤال": item.question, "الإجابة": item.answer, "المحور": item.context.axis, "النطاق": item.context.scope, "مصادر البيانات": item.context.sources.join("، ") || "لا يوجد مصدر نصي محدد", "القياسات الوطنية المعتمدة": item.context.counts.approvedNationalAnnualRows, "القياسات المكانية المعتمدة": item.context.counts.approvedSpatialRows, "نقاط التنبؤ المحسوبة": item.context.counts.calculatedForecastPoints }));
      const workbook = XLSX.utils.book_new(); const sheet = XLSX.utils.json_to_sheet(rows); sheet["!cols"] = [{ wch: 14 }, { wch: 22 }, { wch: 36 }, { wch: 80 }, { wch: 14 }, { wch: 16 }, { wch: 40 }, { wch: 18 }, { wch: 18 }, { wch: 18 }]; sheet["!rows"] = rows.map(() => ({ hpt: 72 })); Object.keys(sheet).filter((key) => !key.startsWith("!")).forEach((key) => { sheet[key].s = { alignment: { wrapText: true, vertical: "top" } }; }); XLSX.utils.book_append_sheet(workbook, sheet, "المحادثات المحددة");
      const sourceRows = items.flatMap((item, index) => (item.context.sources.length ? item.context.sources : ["لا يوجد مصدر نصي محدد"]).map((source) => ({ "رقم المحادثة": index + 1, "السؤال": item.question, "المحور": item.context.axis, "النطاق": item.context.scope, "مصدر البيانات": source, "القياسات الوطنية المعتمدة": item.context.counts.approvedNationalAnnualRows, "القياسات المكانية المعتمدة": item.context.counts.approvedSpatialRows, "نقاط التنبؤ المحسوبة": item.context.counts.calculatedForecastPoints }))); const sourcesSheet = XLSX.utils.json_to_sheet(sourceRows); sourcesSheet["!cols"] = [{ wch: 14 }, { wch: 42 }, { wch: 14 }, { wch: 16 }, { wch: 42 }, { wch: 22 }, { wch: 22 }, { wch: 20 }]; sourcesSheet["!rows"] = sourceRows.map(() => ({ hpt: 48 })); Object.keys(sourcesSheet).filter((key) => !key.startsWith("!")).forEach((key) => { sourcesSheet[key].s = { alignment: { wrapText: true, vertical: "top" } }; }); XLSX.utils.book_append_sheet(workbook, sourcesSheet, "المصادر والإحصائيات");
      const summary = XLSX.utils.json_to_sheet([{ "تاريخ التصدير": new Date().toLocaleString("ar-LY"), "إصدار المنصة": platformVersion, "عدد المحادثات": items.length, "عدد مصادر البيانات": sourceRows.length, "ملاحظة": "تم إنشاء الملف من سجل المساعد المحفوظ محلياً والبيانات المعروضة فيه." }]); summary["!cols"] = [{ wch: 24 }, { wch: 18 }, { wch: 16 }, { wch: 20 }, { wch: 58 }]; summary["!rows"] = [{ hpt: 36 }]; Object.keys(summary).filter((key) => !key.startsWith("!")).forEach((key) => { summary[key].s = { alignment: { wrapText: true, vertical: "top" } }; }); XLSX.utils.book_append_sheet(workbook, summary, "ملخص التصدير");
      setExportProgress(80); XLSX.writeFile(workbook, `محادثات-مساعد-المرصد-${Date.now()}.xlsx`); setExportProgress(100); toast.success(`تم تصدير ${items.length} محادثة إلى Excel.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر إنشاء ملف Excel."); } finally { setIsExporting(false); window.setTimeout(() => setExportProgress(0), 500); }
  }
  function resetHistoryFilters() { setHistoryQuery(""); setHistoryAxis("all"); setHistoryFrom(""); setHistoryTo(""); setHistorySource(""); setHistorySort("newest"); setFilterLinkCopied(false); toast.success("تمت إعادة ضبط فلاتر وفرز سجل المحادثات."); }
  async function copyHistoryFilterLink() { try { await navigator.clipboard.writeText(window.location.href); setFilterLinkCopied(true); toast.success("تم نسخ رابط إعدادات السجل."); window.setTimeout(() => setFilterLinkCopied(false), 1800); } catch { toast.error("تعذر نسخ الرابط تلقائياً."); } }
  function clearHistory() { setHistory([]); setSelectedHistoryIds([]); setMessages([]); setActiveExchange(null); window.localStorage.removeItem(historyStorageKey); window.localStorage.removeItem(selectedHistoryStorageKey); toast.success("تم مسح سجل أسئلة وإجابات المساعد."); setClearDialogOpen(false); }

  function openHistory(item: AssistantExchange) {
    setActiveExchange(item);
    setMessages([{ role: "user", content: item.question }, { role: "assistant", content: item.answer }]);
  }

  return <Card className="overflow-hidden border-[#cfe2db] shadow-sm">
    <CardHeader className="bg-[linear-gradient(135deg,#0f5c58,#174943)] text-white">
      <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15"><Sparkles className="h-5 w-5" /></span><CardTitle className="text-lg text-white">مساعد بيانات المرصد</CardTitle></div><p className="mt-3 max-w-2xl text-xs leading-6 text-teal-50/90">يحلل الأرقام والتنبؤات والبيانات المكانية المعتمدة فقط، ولا يستبدل مراجعة قسم الإحصاء.</p></div><ShieldCheck className="h-5 w-5 text-amber-200" /></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2"><label className="text-xs font-semibold text-teal-50">المحور<Select value={axis} onValueChange={(value) => setAxis(value as typeof axis)}><SelectTrigger className="mt-1 border-white/20 bg-white/10 text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل المحاور</SelectItem><SelectItem value="اقتصادي">اقتصادي</SelectItem><SelectItem value="بيئي">بيئي</SelectItem><SelectItem value="اجتماعي">اجتماعي</SelectItem><SelectItem value="سياحي">سياحي</SelectItem></SelectContent></Select></label><label className="text-xs font-semibold text-teal-50">نطاق البيانات<Select value={scope} onValueChange={(value) => setScope(value as typeof scope)}><SelectTrigger className="mt-1 border-white/20 bg-white/10 text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">الكل</SelectItem><SelectItem value="national">المؤشرات الوطنية</SelectItem><SelectItem value="spatial">المدن والبلديات</SelectItem><SelectItem value="forecast">التنبؤات</SelectItem></SelectContent></Select></label></div>
    </CardHeader>
    <CardContent className="p-0">
      {isExporting && <div role="status" aria-live="polite" className="mx-4 mb-4 rounded-xl border border-[#b9d7cf] bg-[#f0faf6] p-3 text-right"><div className="mb-2 flex items-center justify-between text-xs font-semibold text-[#0f766e]"><span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />جاري إنشاء ملف PDF</span><span>{exportProgress}%</span></div><Progress value={exportProgress} aria-label={`تقدم التصدير ${exportProgress}%`} className="h-2 bg-[#dcefe8] [&_[data-slot=progress-indicator]]:bg-[#0f766e]" /><p className="mt-2 text-[11px] text-slate-500">يتم تجهيز المحادثات ومصادر البيانات المحددة، يرجى الانتظار.</p></div>}
      <AIChatBox messages={messages} onSendMessage={send} isLoading={assistant.isPending} height="520px" placeholder="اكتب سؤالاً عن الأرقام والمؤشرات المعتمدة…" emptyStateMessage="اسأل عن المؤشرات والإحصائيات والتنبؤات أو المدن والبلديات" suggestedPrompts={[...suggestedPrompts]} />
      {activeExchange && <div ref={exportRef} className="mx-4 mb-4 rounded-xl border border-[#dce8e4] bg-white p-4 text-right"><div className="border-b border-[#e8efec] pb-3 text-[11px] text-slate-500">تاريخ التصدير: {exportedAt || "يُحدد عند التصدير"} · إصدار المنصة: {platformVersion}</div><div className="mt-3 flex items-center justify-between gap-3"><div><p className="text-[11px] font-semibold text-[#0f766e]">إجابة مساعد بيانات المرصد</p><p className="mt-1 text-xs text-slate-500">السؤال: {activeExchange.question}</p></div><Button size="sm" onClick={exportActiveAnswer} disabled={isExporting} className="bg-[#0f766e] hover:bg-[#0a5f58]">{isExporting ? <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" /> : <Download className="ml-1 h-3.5 w-3.5" />}{isExporting ? "جاري إنشاء PDF…" : "تصدير PDF"}</Button></div><div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{activeExchange.answer}</div><div className="mt-4 border-t border-[#e8efec] pt-3 text-xs text-slate-600"><p className="font-semibold text-[#173f3d]">مصادر السجلات المستخدمة</p>{activeExchange.context.sources.length ? <ul className="mt-1 list-disc space-y-1 pr-5">{activeExchange.context.sources.map((source) => <li key={source}>{source}</li>)}</ul> : <p className="mt-1">لم تُرجع السجلات مصدراً نصياً محدداً ضمن النطاق المختار.</p>}<p className="mt-2 text-[11px] text-slate-500">النطاق: {activeExchange.context.scope} · المحور: {activeExchange.context.axis} · القياسات الوطنية: {activeExchange.context.counts.approvedNationalAnnualRows} · المكانية: {activeExchange.context.counts.approvedSpatialRows} · نقاط التنبؤ: {activeExchange.context.counts.calculatedForecastPoints}</p></div></div>}
      <div className="flex flex-wrap items-center gap-2 border-t border-[#e4efeb] bg-[#f7fbf9] px-4 py-3 text-[11px] text-slate-600"><Database className="h-4 w-4 text-[#0f766e]" /><span>الأسئلة المقترحة تتغير حسب المحور: {axis === "all" ? "كل المحاور" : axis}</span><Badge variant="outline">{suggestedPrompts.length} اقتراحات</Badge>{activeExchange && <Badge variant="outline">المصادر: {activeExchange.context.sources.length}</Badge>}</div>
      {history.length > 0 && <section className="border-t border-[#e4efeb] bg-[#fbfdfc] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><History className="h-4 w-4 text-[#0f766e]" /><h3 className="text-sm font-bold text-[#173f3d]">سجل أسئلة المساعد</h3><span className="text-[11px] text-slate-500">({history.length})</span></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={isExporting} className="border-[#b9d7cf] text-[#0f766e]" onClick={() => setSelectedHistoryIds(filteredHistory.map((item) => item.id))}>تحديد الكل</Button><Button size="sm" variant="outline" disabled={isExporting || !selectedHistoryIds.length} className="border-[#b9d7cf] text-[#0f766e]" onClick={() => setSelectedHistoryIds([])}>إلغاء تحديد الكل</Button><Button size="sm" variant="outline" disabled={isExporting} className="border-[#b9d7cf] text-[#0f766e]" onClick={exportAllHistory}>{isExporting ? <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" /> : <FileText className="ml-1 h-3.5 w-3.5" />}{isExporting ? "جاري التصدير…" : "تصدير الكل PDF"}</Button><Button size="sm" variant="outline" disabled={isExporting || !filteredHistory.length} className="border-[#b9d7cf] text-[#0f766e]" onClick={exportVisibleHistory}><FileText className="ml-1 h-3.5 w-3.5" />تصدير نتائج البحث PDF ({filteredHistory.length})</Button><Button size="sm" variant="outline" disabled={isExporting || !filteredHistory.length} className="border-[#b9d7cf] text-[#0f766e]" onClick={exportVisibleExcel}><Download className="ml-1 h-3.5 w-3.5" />تصدير نتائج البحث Excel ({filteredHistory.length})</Button><Button size="sm" variant="outline" disabled={isExporting || !selectedHistoryIds.length} className="border-[#b9d7cf] text-[#0f766e]" onClick={exportSelectedHistory}><Download className="ml-1 h-3.5 w-3.5" />تصدير المحدد PDF ({selectedHistoryIds.length})</Button><Button size="sm" variant="outline" disabled={isExporting || !selectedHistoryIds.length} className="border-[#b9d7cf] text-[#0f766e]" onClick={exportSelectedExcel}><Download className="ml-1 h-3.5 w-3.5" />تصدير المحدد Excel</Button><Button size="sm" variant="outline" disabled={isExporting} className="border-[#b9d7cf] text-[#0f766e]" onClick={copyHistoryFilterLink}>{filterLinkCopied ? "تم نسخ الرابط" : "نسخ رابط الفلاتر"}</Button><Button size="sm" variant="outline" disabled={isExporting} className="border-amber-200 text-amber-700 hover:bg-amber-50" onClick={resetHistoryFilters}>إعادة ضبط الفلاتر</Button><Button size="sm" variant="outline" disabled={isExporting} className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => setClearDialogOpen(true)}><Trash2 className="ml-1 h-3.5 w-3.5" />مسح السجل</Button></div></div><div className="mt-3 flex items-center gap-2"><Search className="h-4 w-4 text-[#0f766e]" /><input value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="ابحث في الأسئلة والإجابات والمصادر…" aria-label="بحث في سجل المحادثات" className="h-9 min-w-0 flex-1 rounded-lg border border-[#b9d7cf] bg-white px-3 text-xs text-[#173f3d] outline-none focus:ring-2 focus:ring-[#0f766e]" /></div><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><label className="text-[11px] font-semibold text-[#315b55]">من تاريخ<input type="date" value={historyFrom} onChange={(event) => setHistoryFrom(event.target.value)} aria-label="تصفية من تاريخ" className="mt-1 h-9 w-full rounded-lg border border-[#b9d7cf] bg-white px-2 text-xs text-[#173f3d] outline-none focus:ring-2 focus:ring-[#0f766e]" /></label><label className="text-[11px] font-semibold text-[#315b55]">إلى تاريخ<input type="date" value={historyTo} onChange={(event) => setHistoryTo(event.target.value)} aria-label="تصفية إلى تاريخ" className="mt-1 h-9 w-full rounded-lg border border-[#b9d7cf] bg-white px-2 text-xs text-[#173f3d] outline-none focus:ring-2 focus:ring-[#0f766e]" /></label><label className="text-[11px] font-semibold text-[#315b55]">محور السجل<select value={historyAxis} onChange={(event) => setHistoryAxis(event.target.value as typeof historyAxis)} aria-label="تصفية حسب المحور" className="mt-1 h-9 w-full rounded-lg border border-[#b9d7cf] bg-white px-2 text-xs text-[#173f3d] outline-none focus:ring-2 focus:ring-[#0f766e]"><option value="all">كل المحاور</option><option value="اقتصادي">اقتصادي</option><option value="بيئي">بيئي</option><option value="اجتماعي">اجتماعي</option><option value="سياحي">سياحي</option></select></label><label className="text-[11px] font-semibold text-[#315b55]">ترتيب السجل<select value={historySort} onChange={(event) => setHistorySort(event.target.value as typeof historySort)} aria-label="ترتيب سجل المحادثات" className="mt-1 h-9 w-full rounded-lg border border-[#b9d7cf] bg-white px-2 text-xs text-[#173f3d] outline-none focus:ring-2 focus:ring-[#0f766e]"><option value="newest">الأحدث أولاً</option><option value="oldest">الأقدم أولاً</option></select></label></div><div className="mt-2"><label className="text-[11px] font-semibold text-[#315b55]">مصدر البيانات أو الإحصائية<select value={historySource} onChange={(event) => setHistorySource(event.target.value)} aria-label="تصفية حسب مصدر البيانات" className="mt-1 h-9 w-full rounded-lg border border-[#b9d7cf] bg-white px-2 text-xs text-[#173f3d] outline-none focus:ring-2 focus:ring-[#0f766e]"><option value="">كل المصادر والإحصائيات</option>{historySources.map((source) => <option key={source} value={source}>{source}</option>)}</select></label></div><p className="mt-2 text-[11px] text-slate-500">حدد المحادثات التي تريد تضمينها في ملف PDF أو Excel. النتائج المطابقة: {filteredHistory.length} من {history.length}.</p><div className="mt-3 space-y-2">{filteredHistory.map((item) => <article key={item.id} className="flex gap-3 rounded-xl border border-[#dce8e4] bg-white p-3"><Checkbox checked={selectedHistoryIds.includes(item.id)} onCheckedChange={(checked) => setSelectedHistoryIds((current) => checked ? (current.includes(item.id) ? current : [...current, item.id]) : current.filter((id) => id !== item.id))} aria-label={`تحديد المحادثة: ${item.question}`} /><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-[#173f3d]">{item.question}</p><p className="mt-1 line-clamp-2 text-xs leading-6 text-slate-600">{item.answer}</p><Button size="sm" variant="outline" className="mt-2 border-[#b9d7cf] text-[#0f766e]" onClick={() => openHistory(item)}>عرض الإجابة والمصادر</Button></div></article>)}</div></section>}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}><AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>تأكيد مسح سجل المساعد</AlertDialogTitle><AlertDialogDescription>سيتم حذف جميع الأسئلة والإجابات المحفوظة على هذا المتصفح، ولا يمكن التراجع عن هذا الإجراء. هل تريد المتابعة؟</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction className="bg-red-700 hover:bg-red-800" onClick={clearHistory}>نعم، مسح السجل بالكامل</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </CardContent>
  </Card>;
}
