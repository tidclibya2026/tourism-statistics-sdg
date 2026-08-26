import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { Bell, MessageCircleMore } from "lucide-react";
import { useState } from "react";

export function SupportNotificationBell({ onOpenHelp }: { onOpenHelp: () => void }) {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const notifications = trpc.support.notifications.useQuery(undefined, { refetchInterval: 15_000, refetchOnWindowFocus: true });
  const markRead = trpc.support.markNotificationsRead.useMutation({ onSuccess: () => utils.support.notifications.invalidate() });
  const unread = (notifications.data ?? []).filter((item) => !item.readAt);
  function setPopoverOpen(next: boolean) {
    setOpen(next);
    if (next && unread.length && !markRead.isPending) markRead.mutate({ ids: unread.map((item) => item.id) });
  }
  return <Popover open={open} onOpenChange={setPopoverOpen}><PopoverTrigger asChild><Button variant="ghost" size="icon" className="relative h-9 w-9 text-[#0f5c58] hover:bg-[#e4f0ed]" aria-label="إشعارات الدعم"><Bell className="h-4.5 w-4.5" />{unread.length ? <span className="absolute -left-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">{unread.length > 9 ? "9+" : unread.length}</span> : null}</Button></PopoverTrigger><PopoverContent align="end" className="w-80 p-0" dir="rtl"><div className="border-b border-[#e5eeeb] px-4 py-3"><h3 className="font-bold text-[#173f3d]">إشعارات الدعم</h3><p className="mt-1 text-xs text-slate-500">تتجدد تلقائياً أثناء استخدام المنصة.</p></div><div className="max-h-80 overflow-y-auto p-2">{notifications.data?.length ? notifications.data.map((item) => <button key={item.id} type="button" className="w-full rounded-xl p-3 text-right transition hover:bg-[#f2f8f5]" onClick={() => { setOpen(false); onOpenHelp(); }}><div className="flex items-start gap-2"><MessageCircleMore className="mt-0.5 h-4 w-4 shrink-0 text-[#0f766e]" /><div className="min-w-0"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold text-[#173f3d]">{item.title}</p>{!item.readAt ? <Badge className="border-0 bg-amber-100 text-[10px] text-amber-900">جديد</Badge> : null}</div><p className="mt-1 text-xs leading-5 text-slate-600">{item.message}</p></div></div></button>) : <p className="p-6 text-center text-sm text-slate-500">لا توجد إشعارات دعم حالياً.</p>}</div></PopoverContent></Popover>;
}
