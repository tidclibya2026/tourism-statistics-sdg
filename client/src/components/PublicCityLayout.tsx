import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { LogIn, MapPinned, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";

export default function PublicCityLayout({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();

  return <div dir="rtl" className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#e6f3ef,_#f9fbfa_42%,_#eef4f1)] text-slate-800">
    <header className="border-b border-[#dce8e4] bg-white/90 backdrop-blur">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <button onClick={() => setLocation("/spatial")} className="flex items-center gap-3 text-right" aria-label="العودة إلى المدن السياحية">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0f5c58] text-white shadow-sm"><MapPinned className="h-5 w-5" /></span>
          <span>
            <strong className="block text-sm text-[#123c3a]">منظومة البيانات السياحية الوطنية</strong>
            <span className="mt-0.5 block text-xs font-semibold text-[#0f766e]">المدن السياحية والقياسات المعتمدة</span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex"><ShieldCheck className="h-4 w-4 text-[#0f766e]" />بيانات منشورة ومعتمدة</span>
          <Button variant="outline" size="sm" className="border-[#b8d6ce] bg-white text-[#0f5c58] hover:bg-[#edf7f3]" onClick={() => startLogin()}>
            <LogIn className="ml-1.5 h-4 w-4" />دخول المنظومة
          </Button>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    <footer className="mt-10 border-t border-[#dce8e4] bg-white/70 px-4 py-5 text-center text-xs leading-6 text-slate-500">
      مركز المعلومات والتوثيق السياحي — تُعرض هنا القياسات المدنية التي اكتمل اعتمادها فقط.
    </footer>
  </div>;
}
