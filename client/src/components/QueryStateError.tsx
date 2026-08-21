import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QueryStateError({ message = "تعذر تحميل البيانات في الوقت الحالي.", onRetry }: { message?: string; onRetry: () => void }) {
  return <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><p className="text-sm leading-6">{message}</p></div><Button size="sm" variant="outline" className="border-rose-200 bg-white text-rose-800 hover:bg-rose-100" onClick={onRetry}><RefreshCw className="ml-1.5 h-3.5 w-3.5" />إعادة المحاولة</Button></div>;
}

