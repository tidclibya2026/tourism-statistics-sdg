import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Database, ShieldCheck, Sparkles } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

const suggestedPrompts = [
  "ما أحدث قيمة معتمدة للمؤشرات الاقتصادية؟",
  "ما اتجاه المؤشرات السياحية عبر السنوات المتاحة؟",
  "قارن أحدث قياسات البلديات والمدن المتاحة.",
  "ما التنبؤات المحسوبة من السجل السنوي المعتمد؟",
];

export function DataAssistantPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [axis, setAxis] = useState<"all" | "اقتصادي" | "اجتماعي" | "بيئي" | "سياحي">("all");
  const [scope, setScope] = useState<"all" | "national" | "spatial" | "forecast">("all");
  const [lastContext, setLastContext] = useState<{ counts: { approvedNationalAnnualRows: number; approvedSpatialRows: number; calculatedForecastPoints: number }; axis: string; scope: string } | null>(null);
  const assistant = trpc.assistant.data.useMutation({
    onSuccess: (result, variables) => {
      setMessages((current) => [...current, { role: "user", content: variables.question }, { role: "assistant", content: result.answer }]);
      setLastContext(result.context);
    },
    onError: (error) => toast.error(error.message || "تعذر تشغيل المساعد الذكي."),
  });
  function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || assistant.isPending) return;
    const history = messages.filter((message): message is Extract<Message, { role: "user" | "assistant" }> => message.role !== "system").slice(-6).map(({ role, content }) => ({ role, content }));
    assistant.mutate({ question: trimmed, history, axis: axis === "all" ? undefined : axis, scope });
  }
  return <Card className="overflow-hidden border-[#cfe2db] shadow-sm">
    <CardHeader className="bg-[linear-gradient(135deg,#0f5c58,#174943)] text-white">
      <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15"><Sparkles className="h-5 w-5" /></span><CardTitle className="text-lg text-white">مساعد بيانات المرصد</CardTitle></div><p className="mt-3 max-w-2xl text-xs leading-6 text-teal-50/90">يحلل الأرقام والمؤشرات والتنبؤات والبيانات المكانية المعتمدة فقط، ولا يستبدل مراجعة قسم الإحصاء.</p></div><ShieldCheck className="h-5 w-5 text-amber-200" /></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2"><label className="text-xs font-semibold text-teal-50">المحور<Select value={axis} onValueChange={(value) => setAxis(value as typeof axis)}><SelectTrigger className="mt-1 border-white/20 bg-white/10 text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل المحاور</SelectItem><SelectItem value="اقتصادي">اقتصادي</SelectItem><SelectItem value="بيئي">بيئي</SelectItem><SelectItem value="اجتماعي">اجتماعي</SelectItem><SelectItem value="سياحي">سياحي</SelectItem></SelectContent></Select></label><label className="text-xs font-semibold text-teal-50">نطاق البيانات<Select value={scope} onValueChange={(value) => setScope(value as typeof scope)}><SelectTrigger className="mt-1 border-white/20 bg-white/10 text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">الكل</SelectItem><SelectItem value="national">المؤشرات الوطنية</SelectItem><SelectItem value="spatial">المدن والبلديات</SelectItem><SelectItem value="forecast">التنبؤات</SelectItem></SelectContent></Select></label></div>
    </CardHeader>
    <CardContent className="p-0"><AIChatBox messages={messages} onSendMessage={send} isLoading={assistant.isPending} height="520px" placeholder="اكتب سؤالاً عن الأرقام والمؤشرات المعتمدة…" emptyStateMessage="اسأل عن المؤشرات والإحصائيات والتنبؤات أو المدن والبلديات" suggestedPrompts={suggestedPrompts} />{lastContext && <div className="flex flex-wrap items-center gap-2 border-t border-[#e4efeb] bg-[#f7fbf9] px-4 py-3 text-[11px] text-slate-600"><Database className="h-4 w-4 text-[#0f766e]" /><span>السياق المستخدم: {lastContext.axis} · {lastContext.scope}</span><Badge variant="outline">وطني: {lastContext.counts.approvedNationalAnnualRows}</Badge><Badge variant="outline">مكاني: {lastContext.counts.approvedSpatialRows}</Badge><Badge variant="outline">تنبؤ: {lastContext.counts.calculatedForecastPoints}</Badge></div>}</CardContent>
  </Card>;
}
