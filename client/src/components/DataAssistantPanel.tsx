import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportDashboardPdf } from "@/lib/dashboardPdf";
import { getSuggestedPrompts, suggestedPromptsByAxis } from "@/lib/dataAssistantPrompts";
import { trpc } from "@/lib/trpc";
import { Database, Download, FileText, History, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type AssistantContext = { counts: { approvedNationalAnnualRows: number; approvedSpatialRows: number; calculatedForecastPoints: number }; axis: string; scope: string; sources: string[] };
type AssistantExchange = { id: number; question: string; answer: string; context: AssistantContext };
const historyStorageKey = "tidc-data-assistant-history-v1";

function readHistory(): AssistantExchange[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(historyStorageKey) ?? "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch { return []; }
}

export function DataAssistantPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<AssistantExchange[]>(readHistory);
  const [activeExchange, setActiveExchange] = useState<AssistantExchange | null>(null);
  const [platformVersion, setPlatformVersion] = useState("غير متاح");
  const [exportedAt, setExportedAt] = useState("");
  const [axis, setAxis] = useState<"all" | "اقتصادي" | "اجتماعي" | "بيئي" | "سياحي">("all");
  const [scope, setScope] = useState<"all" | "national" | "spatial" | "forecast">("all");
  const exportRef = useRef<HTMLDivElement>(null);
  const suggestedPrompts = useMemo(() => suggestedPromptsByAxis[axis], [axis]);
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
  useEffect(() => { fetch("/__manus__/version.json", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((payload) => { if (payload?.version) setPlatformVersion(String(payload.version)); }).catch(() => undefined); }, []);

  function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || assistant.isPending) return;
    const chatHistory = messages.filter((message): message is Extract<Message, { role: "user" | "assistant" }> => message.role !== "system").slice(-6).map(({ role, content }) => ({ role, content }));
    assistant.mutate({ question: trimmed, history: chatHistory, axis: axis === "all" ? undefined : axis, scope });
  }

  async function exportActiveAnswer() {
    if (!activeExchange || !exportRef.current) { toast.info("أرسل سؤالاً أو اختر إجابة من السجل أولاً."); return; }
    try { setExportedAt(new Date().toLocaleString("ar-LY")); await exportDashboardPdf(exportRef.current, `إجابة-مساعد-المرصد-${activeExchange.id}.pdf`); toast.success("تم تجهيز إجابة المساعد مع مصادر البيانات للحفظ بصيغة PDF."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تجهيز ملف PDF."); }
  }

  async function exportAllHistory() {
    if (!history.length) { toast.info("لا يوجد سجل محادثات لتصديره بعد."); return; }
    const root = document.createElement("div");
    root.dir = "rtl";
    root.style.cssText = "position:fixed;left:-10000px;top:0;width:900px;background:#fff;color:#173f3d;padding:32px;font-family:Arial,sans-serif;";
    const title = document.createElement("h1"); title.textContent = "سجل مساعد بيانات المرصد"; title.style.cssText = "margin:0 0 8px;font-size:24px";
    const meta = document.createElement("p"); meta.textContent = `تاريخ التصدير: ${new Date().toLocaleString("ar-LY")} · إصدار المنصة: ${platformVersion}`; meta.style.cssText = "margin:0 0 24px;color:#64748b;font-size:12px";
    root.append(title, meta);
    history.slice().reverse().forEach((item, index) => { const article = document.createElement("article"); article.style.cssText = "border-top:1px solid #dce8e4;padding:18px 0;"; const question = document.createElement("p"); question.textContent = `${index + 1}. السؤال: ${item.question}`; question.style.cssText = "font-weight:700;margin:0 0 8px"; const answer = document.createElement("div"); answer.textContent = item.answer; answer.style.cssText = "white-space:pre-wrap;line-height:1.8"; const details = document.createElement("p"); details.textContent = `المحور: ${item.context.axis} · النطاق: ${item.context.scope}\nالمصادر: ${item.context.sources.length ? item.context.sources.join("، ") : "لا يوجد مصدر نصي محدد"}`; details.style.cssText = "font-size:11px;color:#64748b;margin:12px 0 0;white-space:pre-wrap"; article.append(question, answer, details); root.append(article); });
    document.body.append(root);
    try { await exportDashboardPdf(root, `سجل-مساعد-المرصد-${Date.now()}.pdf`); toast.success("تم تجهيز سجل المحادثات الكامل بصيغة PDF."); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تجهيز سجل المحادثات."); } finally { root.remove(); }
  }

  function clearHistory() {
    setHistory([]); setMessages([]); setActiveExchange(null); window.localStorage.removeItem(historyStorageKey); toast.success("تم مسح سجل أسئلة وإجابات المساعد.");
  }

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
      <AIChatBox messages={messages} onSendMessage={send} isLoading={assistant.isPending} height="520px" placeholder="اكتب سؤالاً عن الأرقام والمؤشرات المعتمدة…" emptyStateMessage="اسأل عن المؤشرات والإحصائيات والتنبؤات أو المدن والبلديات" suggestedPrompts={[...suggestedPrompts]} />
      {activeExchange && <div ref={exportRef} className="mx-4 mb-4 rounded-xl border border-[#dce8e4] bg-white p-4 text-right"><div className="border-b border-[#e8efec] pb-3 text-[11px] text-slate-500">تاريخ التصدير: {exportedAt || "يُحدد عند التصدير"} · إصدار المنصة: {platformVersion}</div><div className="mt-3 flex items-center justify-between gap-3"><div><p className="text-[11px] font-semibold text-[#0f766e]">إجابة مساعد بيانات المرصد</p><p className="mt-1 text-xs text-slate-500">السؤال: {activeExchange.question}</p></div><Button size="sm" onClick={exportActiveAnswer} className="bg-[#0f766e] hover:bg-[#0a5f58]"><Download className="ml-1 h-3.5 w-3.5" />تصدير PDF</Button></div><div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{activeExchange.answer}</div><div className="mt-4 border-t border-[#e8efec] pt-3 text-xs text-slate-600"><p className="font-semibold text-[#173f3d]">مصادر السجلات المستخدمة</p>{activeExchange.context.sources.length ? <ul className="mt-1 list-disc space-y-1 pr-5">{activeExchange.context.sources.map((source) => <li key={source}>{source}</li>)}</ul> : <p className="mt-1">لم تُرجع السجلات مصدراً نصياً محدداً ضمن النطاق المختار.</p>}<p className="mt-2 text-[11px] text-slate-500">النطاق: {activeExchange.context.scope} · المحور: {activeExchange.context.axis} · القياسات الوطنية: {activeExchange.context.counts.approvedNationalAnnualRows} · المكانية: {activeExchange.context.counts.approvedSpatialRows} · نقاط التنبؤ: {activeExchange.context.counts.calculatedForecastPoints}</p></div></div>}
      <div className="flex flex-wrap items-center gap-2 border-t border-[#e4efeb] bg-[#f7fbf9] px-4 py-3 text-[11px] text-slate-600"><Database className="h-4 w-4 text-[#0f766e]" /><span>الأسئلة المقترحة تتغير حسب المحور: {axis === "all" ? "كل المحاور" : axis}</span><Badge variant="outline">{suggestedPrompts.length} اقتراحات</Badge>{activeExchange && <Badge variant="outline">المصادر: {activeExchange.context.sources.length}</Badge>}</div>
      {history.length > 0 && <section className="border-t border-[#e4efeb] bg-[#fbfdfc] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><History className="h-4 w-4 text-[#0f766e]" /><h3 className="text-sm font-bold text-[#173f3d]">سجل أسئلة المساعد</h3><span className="text-[11px] text-slate-500">({history.length})</span></div><div className="flex gap-2"><Button size="sm" variant="outline" className="border-[#b9d7cf] text-[#0f766e]" onClick={exportAllHistory}><FileText className="ml-1 h-3.5 w-3.5" />تصدير السجل PDF</Button><Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={clearHistory}><Trash2 className="ml-1 h-3.5 w-3.5" />مسح السجل</Button></div></div><div className="mt-3 space-y-2">{history.map((item) => <article key={item.id} className="rounded-xl border border-[#dce8e4] bg-white p-3"><p className="text-xs font-semibold text-[#173f3d]">{item.question}</p><p className="mt-1 line-clamp-2 text-xs leading-6 text-slate-600">{item.answer}</p><Button size="sm" variant="outline" className="mt-2 border-[#b9d7cf] text-[#0f766e]" onClick={() => openHistory(item)}>عرض الإجابة والمصادر</Button></article>)}</div></section>}
    </CardContent>
  </Card>;
}
