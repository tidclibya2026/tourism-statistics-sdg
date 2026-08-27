import { AssistantMiniCharts, type AssistantMiniVisualization } from "@/components/AssistantMiniCharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { LoaderCircle, Search, ShieldCheck, Sparkles } from "lucide-react";
import React, { FormEvent, useState } from "react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

type SearchAxis = "all" | "اقتصادي" | "اجتماعي" | "بيئي" | "سياحي";
type SearchScope = "all" | "national" | "spatial" | "forecast";

type SearchResult = {
  answer: string;
  context: {
    axis: string;
    scope: string;
    sources: string[];
    counts: {
      approvedNationalAnnualRows: number;
      approvedSpatialRows: number;
      calculatedForecastPoints: number;
    };
    visualizations?: AssistantMiniVisualization[];
  };
};

const suggestions = [
  "ما أحدث قيمة معتمدة للمؤشرات السياحية؟",
  "ما اتجاه القياسات السنوية للزوار؟",
  "قارن المدن والبلديات في أحدث سنة متاحة.",
  "ما التنبؤات المحسوبة من السجل السنوي المعتمد؟",
];

function countLabel(value: number, singular: string, plural: string) {
  return `${value.toLocaleString("ar-LY")} ${value === 1 ? singular : plural}`;
}

export function SmartTourismSearch() {
  const [question, setQuestion] = useState("");
  const [axis, setAxis] = useState<SearchAxis>("all");
  const [scope, setScope] = useState<SearchScope>("all");
  const [result, setResult] = useState<SearchResult | null>(null);
  const assistant = trpc.assistant.data.useMutation({
    onSuccess: response => setResult(response as SearchResult),
    onError: error => {
      setResult(null);
      toast.error(error.message || "تعذر تشغيل البحث الذكي.");
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length < 2) {
      toast.error("اكتب سؤالاً لا يقل عن حرفين.");
      return;
    }
    assistant.mutate({
      question: trimmed,
      history: [],
      axis: axis === "all" ? undefined : axis,
      scope,
    });
  }

  return (
    <Card className="smart-tourism-search overflow-hidden border-[#cfe2db] bg-[linear-gradient(135deg,#f2faf7,#ffffff)] shadow-sm">
      <CardContent className="p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#dff0e9] text-[#0f5c58]">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-[#173f3d]">البحث الذكي في الإحصائيات</h2>
                <Badge className="border-0 bg-[#e8f3ef] text-[#0f766e]">
                  بيانات معتمدة فقط
                </Badge>
              </div>
              <p className="mt-1 max-w-2xl text-xs leading-6 text-slate-600">
                اكتب سؤالك بالعربية كما تتحدث به. سيبحث المساعد في المؤشرات والقياسات الوطنية والمكانية والتنبؤات المحسوبة، دون استخدام المسودات أو مصادر خارجية.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0f766e]">
            <ShieldCheck className="h-4 w-4" />
            نطاق داخلي محكوم
          </div>
        </div>

        <form className="mt-5 space-y-3" onSubmit={submit}>
          <div className="flex flex-col gap-2 md:flex-row">
            <label className="min-w-0 flex-1">
              <span className="sr-only">سؤال البحث الذكي</span>
              <Input
                value={question}
                onChange={event => setQuestion(event.target.value)}
                placeholder="مثال: ما أحدث قيمة معتمدة للزوار في طرابلس؟"
                aria-label="سؤال البحث الذكي"
                disabled={assistant.isPending}
                className="h-11 border-[#b9d7cf] bg-white pr-4"
              />
            </label>
            <Button
              type="submit"
              className="h-11 bg-[#0f5c58] px-5 hover:bg-[#0a4845]"
              disabled={assistant.isPending || question.trim().length < 2}
              aria-busy={assistant.isPending}
            >
              {assistant.isPending ? (
                <LoaderCircle className="ml-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Search className="ml-1.5 h-4 w-4" />
              )}
              {assistant.isPending ? "جارٍ تحليل السؤال…" : "بحث ذكي"}
            </Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold">المحور</span>
              <select
                value={axis}
                onChange={event => setAxis(event.target.value as SearchAxis)}
                disabled={assistant.isPending}
                className="h-9 rounded-md border border-[#cfe2db] bg-white px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/30"
                aria-label="محور البحث"
              >
                <option value="all">كل المحاور</option>
                <option value="اقتصادي">اقتصادي</option>
                <option value="اجتماعي">اجتماعي</option>
                <option value="بيئي">بيئي</option>
                <option value="سياحي">سياحي</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold">النطاق</span>
              <select
                value={scope}
                onChange={event => setScope(event.target.value as SearchScope)}
                disabled={assistant.isPending}
                className="h-9 rounded-md border border-[#cfe2db] bg-white px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/30"
                aria-label="نطاق البحث"
              >
                <option value="all">كل البيانات</option>
                <option value="national">الوطنية</option>
                <option value="spatial">المدن والبلديات</option>
                <option value="forecast">التنبؤات</option>
              </select>
            </label>
            <div className="flex flex-1 flex-wrap gap-1.5 sm:justify-end">
              {suggestions.map(prompt => (
                <button
                  key={prompt}
                  type="button"
                  className="rounded-full border border-[#cfe2db] bg-white px-2.5 py-1.5 text-[11px] text-[#0f766e] hover:bg-[#eaf6f1]"
                  onClick={() => setQuestion(prompt)}
                  disabled={assistant.isPending}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </form>

        {result && (
          <div className="mt-5 rounded-xl border border-[#d5e7df] bg-white p-4" aria-live="polite">
            <div className="prose prose-slate max-w-none text-sm leading-7 text-slate-700">
              <Streamdown>{result.answer}</Streamdown>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#edf3f0] pt-3 text-[11px] text-slate-500">
              <Badge variant="outline" className="border-[#b9d7cf] text-[#0f766e]">
                النطاق: {result.context.scope}
              </Badge>
              <span>
                {countLabel(result.context.counts.approvedNationalAnnualRows, "قياس وطني معتمد", "قياساً وطنياً معتمداً")}
              </span>
              <span>
                {countLabel(result.context.counts.approvedSpatialRows, "قياس مكاني معتمد", "قياساً مكانياً معتمداً")}
              </span>
              <span>
                {countLabel(result.context.counts.calculatedForecastPoints, "نقطة تنبؤ", "نقاط تنبؤ")}
              </span>
            </div>
            {result.context.sources.length > 0 && (
              <p className="mt-2 text-[11px] leading-5 text-slate-500">
                المصادر المستخدمة: {result.context.sources.join("، ")}
              </p>
            )}
            <AssistantMiniCharts visualizations={result.context.visualizations ?? []} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
