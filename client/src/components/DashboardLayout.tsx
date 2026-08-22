import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { roleLabels } from "@/lib/tourism";
import {
  BarChart3,
  Database,
  FileBarChart,
  FileUp,
  Sparkles,
  GitCompareArrows,
  LayoutDashboard,
  LogOut,
  Settings2,
  ShieldCheck,
  Archive,
  MapPinned,
  ClipboardPenLine,
  Send,
} from "lucide-react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

type UserRole = "admin" | "analyst" | "viewer";

const navigation: { icon: typeof LayoutDashboard; label: string; path: string; access: UserRole[] }[] = [
  { icon: LayoutDashboard, label: "لوحة المؤشرات", path: "/", access: ["admin", "analyst", "viewer"] },
  { icon: BarChart3, label: "إدارة المؤشرات", path: "/indicators", access: ["admin", "analyst", "viewer"] },
  { icon: Database, label: "إدخال البيانات", path: "/data", access: ["admin", "analyst", "viewer"] },
  { icon: Sparkles, label: "التنبؤ السياحي", path: "/forecast", access: ["admin", "analyst", "viewer"] },
  { icon: Archive, label: "الأرشيف التاريخي", path: "/archive", access: ["admin", "analyst", "viewer"] },
  { icon: MapPinned, label: "الأقاليم والمدن", path: "/spatial", access: ["admin", "analyst", "viewer"] },
  { icon: ClipboardPenLine, label: "إدارة البيانات المكانية", path: "/spatial-management", access: ["admin", "analyst"] },
  { icon: GitCompareArrows, label: "مقارنة المؤشرات", path: "/compare", access: ["admin", "analyst", "viewer"] },
  { icon: FileUp, label: "استيراد البيانات", path: "/imports", access: ["admin", "analyst"] },
  { icon: FileBarChart, label: "التقارير والتصدير", path: "/reports", access: ["admin", "analyst", "viewer"] },
  { icon: Send, label: "مركز النشر الموحد", path: "/publication", access: ["admin", "analyst", "viewer"] },
  { icon: Settings2, label: "المستخدمون والصلاحيات", path: "/users", access: ["admin"] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <main className="min-h-screen grid place-items-center bg-[radial-gradient(circle_at_top,_#e7f5f3,_#f6f8f5_42%,_#edf1ee)] px-5" dir="rtl">
        <section className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/85 p-9 text-center shadow-[0_24px_70px_rgba(25,72,69,.14)] backdrop-blur">
          <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-[#0f5c58] text-white shadow-lg">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <p className="mb-2 text-sm font-bold tracking-[.18em] text-[#b57a32]">مركز المعلومات والتوثيق السياحي</p>
          <h1 className="text-2xl font-bold text-[#123c3a]">منصة الإحصاءات والمؤشرات السياحية</h1>
          <p className="mt-4 leading-7 text-slate-600">سجّل الدخول للوصول إلى بيانات المؤشرات والتقارير وفق صلاحيات حسابك.</p>
          <Button onClick={() => startLogin()} className="mt-7 h-12 w-full bg-[#0f5c58] text-base hover:bg-[#0a4845]">
            تسجيل الدخول إلى المنصة
          </Button>
        </section>
      </main>
    );
  }

  const menuItems = navigation.filter((item) => item.access.includes(user.role));
  const activeTitle = menuItems.find((item) => item.path === location)?.label ?? "منصة المؤشرات";

  return (
    <SidebarProvider defaultOpen>
      <Sidebar side="right" collapsible="icon" className="border-l border-l-[#dce8e4] bg-[#0d3e3c] text-white" dir="rtl">
        <SidebarHeader className="h-auto border-b border-white/10 px-3 py-5">
          <button className="flex w-full items-center gap-3 text-right" onClick={() => setLocation("/")} aria-label="العودة إلى لوحة المؤشرات">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#c58a3f] text-[#153c39] shadow-lg">
              <BarChart3 className="h-5 w-5" />
            </span>
            <span className="group-data-[collapsible=icon]:hidden">
              <strong className="block text-sm leading-5 text-white">المرصد الوطني للسياحة</strong>
              <span className="block text-[11px] text-teal-100/70">الإحصاءات والمؤشرات</span>
            </span>
          </button>
        </SidebarHeader>

        <SidebarContent className="px-3 py-5">
          <p className="mb-3 px-3 text-[10px] font-bold tracking-[.14em] text-teal-100/50 group-data-[collapsible=icon]:hidden">إدارة المنظومة</p>
          <SidebarMenu>
            {menuItems.map((item) => {
              const active = location === item.path;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={active}
                    tooltip={item.label}
                    onClick={() => setLocation(item.path)}
                    className="h-11 rounded-xl px-3 text-teal-50 hover:bg-white/10 hover:text-white data-[active=true]:bg-[#c58a3f] data-[active=true]:text-[#153c39] data-[active=true]:shadow-md"
                  >
                    <item.icon className="h-[18px] w-[18px]" />
                    <span className="font-medium">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-white/5 p-2 group-data-[collapsible=icon]:justify-center">
            <Avatar className="h-9 w-9 border border-white/20">
              <AvatarFallback className="bg-teal-100 text-sm font-bold text-[#0d3e3c]">{user.name?.trim().charAt(0) || "م"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold">{user.name || "مستخدم المنصة"}</p>
              <Badge variant="outline" className="mt-1 border-teal-100/20 bg-transparent px-1.5 py-0 text-[10px] text-teal-100">{roleLabels[user.role]}</Badge>
            </div>
            <button onClick={logout} className="rounded-md p-1.5 text-teal-100/70 transition hover:bg-white/10 hover:text-white group-data-[collapsible=icon]:hidden" aria-label="تسجيل الخروج">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0 bg-[#f4f7f5]" dir="rtl">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#dce8e4] bg-[#f9fbfa]/92 px-4 backdrop-blur md:px-7">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="rounded-lg text-[#0f5c58] hover:bg-[#e4f0ed]" />
            <div>
              <p className="text-xs font-medium text-slate-500">منظومة البيانات السياحية الوطنية</p>
              <h2 className="text-sm font-bold text-[#153c39]">{activeTitle}</h2>
            </div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-500">النظام يعمل</span>
          </div>
        </header>
        <main className="min-h-[calc(100vh-4rem)] p-4 md:p-7">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
