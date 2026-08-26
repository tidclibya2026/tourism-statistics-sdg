import { AIChatBox, type Message } from "@/components/AIChatBox";
import { useAuth } from "@/_core/hooks/useAuth";
import { helpFaqs } from "@/lib/helpContent";
import { trpc } from "@/lib/trpc";
import { BotMessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";

export function HelpChatPanel() {
  const { user } = useAuth();
  const role = user?.role ?? "viewer";
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "مرحباً، أنا مساعد الدليل. يمكنني شرح الإدخال والمراجعة والاعتماد والتقارير والصلاحيات بناءً على دليل المنصة. ما سؤالك؟" },
  ]);
  const chat = trpc.support.chat.useMutation({
    onSuccess: (response) => setMessages((items) => [...items, { role: "assistant", content: response.answer }]),
    onError: () => { setMessages((items) => [...items, { role: "assistant", content: "تعذر الوصول إلى المساعد الآن. يمكنك استخدام نموذج التواصل مع الإدارة." }]); toast.error("تعذر توليد إجابة المساعد الآن."); },
  });
  const [escalation, setEscalation] = useState("");
  const escalate = trpc.support.escalateToHuman.useMutation({
    onSuccess: () => { setEscalation(""); toast.success("تم تحويل طلبك إلى موظف دعم بشري، وستظهر أي تحديثات في الإشعارات."); },
    onError: (error) => toast.error(error.message),
  });
  function send(question: string) {
    const history = messages.slice(-6).map(({ role, content }) => ({ role: role === "assistant" ? "assistant" as const : "user" as const, content }));
    setMessages((items) => [...items, { role: "user", content: question }]);
    chat.mutate({ question, history });
  }
  const suggestions = helpFaqs.filter((faq) => faq.roles.includes(role)).slice(0, 3).map((faq) => faq.question);
  return <section className="overflow-hidden rounded-2xl border border-[#cfe3dc] bg-white shadow-sm"><div className="bg-[linear-gradient(135deg,#e9f4f1,#f7fbf9)] px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0f766e] text-white"><BotMessageSquare className="h-5 w-5" /></span><div><h2 className="font-bold text-[#173f3d]">المساعد الذكي للدليل</h2><p className="mt-1 text-xs leading-5 text-slate-600">يجيب من دليل المستخدم والأسئلة الشائعة فقط؛ لا يعتمد بيانات أو يغير صلاحيات أو يطلب أسراراً.</p></div></div><div className="mt-4"><p className="text-xs font-bold text-[#42655d]">أسئلة مقترحة لدورك</p><div className="mt-2 flex flex-wrap gap-2">{suggestions.map((suggestion) => <button key={suggestion} type="button" disabled={chat.isPending} onClick={() => send(suggestion)} className="rounded-full border border-[#b9d7cf] bg-white px-3 py-1.5 text-xs text-[#0f766e] transition hover:bg-[#dff0eb] disabled:opacity-60">{suggestion}</button>)}</div></div></div><AIChatBox messages={messages} onSendMessage={send} isLoading={chat.isPending} height="360px" className="border-0 shadow-none" placeholder="اكتب سؤالك عن استخدام المنصة…" emptyStateMessage="اسأل عن أي خطوة من خطوات الدليل." /><div className="border-t border-[#e2ece8] bg-[#f9fcfa] p-4"><p className="text-sm font-bold text-[#173f3d]">لم يحل المساعد مشكلتك؟</p><p className="mt-1 text-xs leading-5 text-slate-600">اكتب ملخصاً وسيحوّل إلى موظف دعم بشري مع تنبيه تشغيلي للإدارة.</p><Textarea value={escalation} onChange={(event) => setEscalation(event.target.value)} className="mt-3 min-h-20 bg-white" maxLength={3000} placeholder="اشرح ما الذي تحتاجه من موظف الدعم…" /><Button className="mt-2 bg-[#0f766e] hover:bg-[#0a5f58]" disabled={escalate.isPending || escalation.trim().length < 10} onClick={() => escalate.mutate({ message: escalation.trim() })}>{escalate.isPending ? "جارٍ التحويل…" : "تحويل إلى دعم بشري"}</Button></div></section>;
}
