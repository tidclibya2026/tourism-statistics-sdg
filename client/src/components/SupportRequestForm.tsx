import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { FileUp, Paperclip, Send, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

const categories = { question: "استفسار", issue: "مشكلة تقنية أو بيانات", suggestion: "اقتراح تحسين" } as const;
const allowedTypes = new Set(["image/png", "image/jpeg", "application/pdf", "text/plain"]);
const maxBytes = 4 * 1024 * 1024;

function asBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("تعذر قراءة الملف."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

export function SupportRequestForm() {
  const [category, setCategory] = useState<keyof typeof categories>("question");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const utils = trpc.useUtils();
  const submitRequest = trpc.support.submit.useMutation();
  const upload = trpc.support.uploadAttachment.useMutation();
  const isPending = submitRequest.isPending || upload.isPending;
  function chooseFiles(selected: FileList | null) {
    const incoming = Array.from(selected ?? []);
    const valid = incoming.filter((file) => allowedTypes.has(file.type) && file.size <= maxBytes);
    if (valid.length !== incoming.length) toast.error("يسمح فقط بـ PNG أو JPG أو PDF أو TXT بحجم لا يتجاوز 4 ميغابايت.");
    setFiles((current) => [...current, ...valid].slice(0, 3));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const request = await submitRequest.mutateAsync({ category, subject, message });
      for (const file of files) {
        await upload.mutateAsync({ supportRequestId: request.id, fileName: file.name, mimeType: file.type as "image/png" | "image/jpeg" | "application/pdf" | "text/plain", base64: await asBase64(file) });
      }
      setSubject(""); setMessage(""); setFiles([]);
      await utils.support.mine.invalidate();
      toast.success(files.length ? "تم إرسال الطلب ومرفقاته إلى الإدارة." : "تم إرسال رسالتك إلى الإدارة للمتابعة.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر إرسال طلب الدعم."); }
  }
  return <article className="rounded-2xl border border-[#dce8e4] bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><Paperclip className="h-5 w-5" /></span><div><h2 className="font-bold text-[#173f3d]">تواصل مع الإدارة</h2><p className="mt-1 text-sm text-slate-500">أرسل استفساراً أو مشكلة أو اقتراحاً. لا تضع كلمات مرور أو رموز دخول أو بيانات سرية.</p></div></div><form className="mt-4 space-y-3" onSubmit={submit}><div className="grid gap-3 sm:grid-cols-[.7fr_1.3fr]"><div className="space-y-1.5"><Label>نوع الرسالة</Label><Select value={category} onValueChange={(value: keyof typeof categories) => setCategory(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="question">استفسار</SelectItem><SelectItem value="issue">مشكلة تقنية أو بيانات</SelectItem><SelectItem value="suggestion">اقتراح تحسين</SelectItem></SelectContent></Select></div><div className="space-y-1.5"><Label htmlFor="support-subject">العنوان</Label><Input id="support-subject" value={subject} minLength={4} maxLength={180} onChange={(event) => setSubject(event.target.value)} placeholder="مثال: مشكلة في استيراد ملف المدن" required /></div></div><div className="space-y-1.5"><Label htmlFor="support-message">التفاصيل</Label><Textarea id="support-message" value={message} minLength={10} maxLength={5000} onChange={(event) => setMessage(event.target.value)} className="min-h-28" placeholder="اشرح الخطوات التي اتبعتها وما الذي ظهر لك." required /></div><div className="rounded-xl border border-dashed border-[#c8ded7] bg-[#f7faf9] p-3"><Label htmlFor="support-files" className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#0f766e]"><FileUp className="h-4 w-4" />إرفاق لقطات شاشة أو ملفات توضيحية</Label><Input id="support-files" type="file" className="mt-2 cursor-pointer" accept="image/png,image/jpeg,application/pdf,text/plain,.txt" multiple onChange={(event) => chooseFiles(event.target.files)} disabled={isPending} /><p className="mt-2 text-xs leading-5 text-slate-500">حتى 3 ملفات، كل ملف حتى 4 ميغابايت: PNG أو JPG أو PDF أو TXT.</p>{files.length ? <div className="mt-3 flex flex-wrap gap-2">{files.map((file, index) => <Badge key={`${file.name}-${index}`} variant="outline" className="gap-1 border-[#b9d7cf] bg-white text-[#173f3d]">{file.name}<button type="button" aria-label={`إزالة ${file.name}`} onClick={() => setFiles((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X className="h-3.5 w-3.5" /></button></Badge>)}</div> : null}</div><Button type="submit" disabled={isPending} className="bg-[#0f766e] hover:bg-[#0a5f58]"><Send className="ml-1.5 h-4 w-4" />{isPending ? "جارٍ الإرسال…" : "إرسال إلى الإدارة"}</Button></form></article>;
}
