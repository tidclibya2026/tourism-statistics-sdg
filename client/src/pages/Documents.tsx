import React, { useMemo, useState } from "react";
import { zipSync, strToU8 } from "fflate";
import { Archive, Download, FileText, FolderArchive, LockKeyhole, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { documentCategories, documentLibrary, type DocumentCategory } from "@/lib/documentLibrary";

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Documents() {
  const { user } = useAuth();
  const capabilities = trpc.auth.administrativeCapabilities.useQuery(undefined, { enabled: user?.role === "admin", retry: false, refetchOnWindowFocus: false });
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | DocumentCategory>("all");
  const [zipping, setZipping] = useState(false);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ar");
    return documentLibrary.filter((document) => (category === "all" || document.category === category) && (!normalized || `${document.title} ${document.description} ${document.category}`.toLocaleLowerCase("ar").includes(normalized)));
  }, [category, query]);
  const canExportZip = user?.role === "admin" && Boolean(capabilities.data?.canReviewSecurity || capabilities.data?.canManageRoles || capabilities.data?.canApproveReleases);

  function downloadDocument(document: (typeof documentLibrary)[number]) {
    downloadBlob(new Blob([document.content], { type: "text/markdown;charset=utf-8" }), document.fileName.split("/").pop() ?? "document.md");
    toast.success(`تم تنزيل «${document.title}».`);
  }

  function downloadZip() {
    if (!canExportZip || zipping) return;
    setZipping(true);
    try {
      const files = Object.fromEntries(documentLibrary.map((document) => [document.fileName, strToU8(document.content)]));
      const archive = zipSync(files, { level: 6 });
      downloadBlob(new Blob([archive], { type: "application/zip" }), `tidc-documentation-${new Date().toISOString().slice(0, 10)}.zip`);
      toast.success("تم تنزيل حزمة الأدلة ZIP.");
    } catch (error) {
      console.error("Documentation ZIP export failed", error);
      toast.error("تعذر إنشاء حزمة الوثائق حالياً.");
    } finally {
      setZipping(false);
    }
  }

  return <main dir="rtl" className="space-y-6">
    <section className="overflow-hidden rounded-[2rem] bg-[#0f5c58] p-6 text-white shadow-[0_22px_60px_rgba(15,92,88,.18)] md:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-bold tracking-[.15em] text-amber-200">مركز المعرفة المؤسسي</p><h1 className="mt-2 text-3xl font-bold">مكتبة الوثائق</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-teal-50/85">الأدلة المعمارية والتشغيلية والأمنية والإحصائية في مكان واحد، مع تنزيل فردي وحزمة ZIP للمسؤولين المفوضين.</p></div>
        {canExportZip ? <Button onClick={downloadZip} disabled={zipping} className="bg-[#d9a357] text-[#173f3d] hover:bg-[#edb96d]"><FolderArchive className="ml-2 h-4 w-4" />{zipping ? "جارٍ تجهيز ZIP…" : "تصدير حزمة ZIP"}</Button> : <div className="flex items-center gap-2 text-xs text-teal-50/75"><LockKeyhole className="h-4 w-4" />حزمة ZIP للمسؤول المفوض فقط</div>}
      </div>
    </section>
    <section className="section-card space-y-4 p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h2 className="font-bold text-[#173f3d]">تصفح الأدلة</h2><p className="mt-1 text-sm text-slate-500">{filtered.length} من {documentLibrary.length} وثائق متاحة لحسابك.</p></div><div className="relative w-full md:max-w-md"><Search className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="pr-9" placeholder="ابحث باسم الدليل أو موضوعه…" aria-label="البحث في مكتبة الوثائق" /></div></div>
      <div className="flex flex-wrap gap-2"><Button size="sm" variant={category === "all" ? "default" : "outline"} onClick={() => setCategory("all")} className={category === "all" ? "bg-[#0f766e] hover:bg-[#0a5f58]" : ""}>الكل</Button>{documentCategories().map((item) => <Button key={item} size="sm" variant={category === item ? "default" : "outline"} onClick={() => setCategory(item)} className={category === item ? "bg-[#0f766e] hover:bg-[#0a5f58]" : ""}>{item}</Button>)}</div>
    </section>
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((document) => <Card key={document.fileName} className="flex flex-col border-[#dce8e4] p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e9f4f1] text-[#0f766e]"><FileText className="h-5 w-5" /></span><Badge className="border-0 bg-[#f4ead9] text-[#8b5d24]">{document.category}</Badge></div><h2 className="mt-4 font-bold text-[#173f3d]">{document.title}</h2><p className="mt-2 flex-1 text-sm leading-7 text-slate-600">{document.description}</p><Button variant="outline" onClick={() => downloadDocument(document)} className="mt-5 border-[#b9d7cf] text-[#0f766e]"><Download className="ml-2 h-4 w-4" />تنزيل الدليل</Button></Card>)}</section>
    {!filtered.length && <div className="section-card p-10 text-center text-slate-500">لا توجد وثائق مطابقة للبحث الحالي.</div>}
    <section className="section-card flex items-start gap-3 p-4 text-sm leading-7 text-slate-600"><Archive className="mt-1 h-5 w-5 shrink-0 text-[#b47730]" /><p>الحزمة تتضمن الأدلة فقط ولا تتضمن أسرار OAuth أو قاعدة البيانات أو بيانات المستخدمين. جميع الوثائق تصف الاستخدام الداخلي وسياسة الاعتماد الحالية.</p></section>
  </main>;
}
