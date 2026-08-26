import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { BotMessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function HelpChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "مرحباً، أنا مساعد الدليل. يمكنني شرح الإدخال والمراجعة والاعتماد والتقارير والصلاحيات بناءً على دليل المنصة. ما سؤالك؟" },
  ]);
  const chat = trpc.support.chat.useMutation({
    onSuccess: (response) => setMessages((items) => [...items, { role: "assistant", content: response.answer }]),
    onError: () => { setMessages((items) => [...items, { role: "assistant", content: "تعذر الوصول إلى المساعد الآن. يمكنك استخدام نموذج التواصل مع الإدارة." }]); toast.error("تعذر توليد إجابة المساعد الآن."); },
  });
  function send(question: string) {
    const history = messages.slice(-6).map(({ role, content }) => ({ role: role === "assistant" ? "assistant" as const : "user" as const, content }));
    setMessages((items) => [...items, { role: "user", content: question }]);
    chat.mutate({ question, history });
  }
  return <section className="overflow-hidden rounded-2xl border border-[#cfe3dc] bg-white shadow-sm"><div className="bg-[linear-gradient(135deg,#e9f4f1,#f7fbf9)] px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0f766e] text-white"><BotMessageSquare className="h-5 w-5" /></span><div><h2 className="font-bold text-[#173f3d]">المساعد الذكي للدليل</h2><p className="mt-1 text-xs leading-5 text-slate-600">يجيب من دليل المستخدم والأسئلة الشائعة فقط؛ لا يعتمد بيانات أو يغير صلاحيات أو يطلب أسراراً.</p></div></div></div><AIChatBox messages={messages} onSendMessage={send} isLoading={chat.isPending} height="360px" className="border-0 shadow-none" placeholder="اكتب سؤالك عن استخدام المنصة…" emptyStateMessage="اسأل عن أي خطوة من خطوات الدليل." suggestedPrompts={["كيف أرسل قياساً للمراجعة؟", "ما الفرق بين المراجعة والاعتماد؟", "كيف أرفع مشكلة تقنية للإدارة؟"]} /></section>;
}
