import React from "react";
import { Badge } from "@/components/ui/badge";
import { BarChart3, LineChart as LineChartIcon, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type AssistantMiniVisualization = {
  id: string;
  kind: "trend" | "ranking" | "forecast";
  title: string;
  description: string;
  unit: string;
  data: Array<{ label: string; value: number }>;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-LY", { maximumFractionDigits: 2 }).format(value);
}

function chartIcon(kind: AssistantMiniVisualization["kind"]) {
  if (kind === "ranking") return <BarChart3 className="h-4 w-4" />;
  if (kind === "forecast") return <TrendingUp className="h-4 w-4" />;
  return <LineChartIcon className="h-4 w-4" />;
}

function chartColor(kind: AssistantMiniVisualization["kind"]) {
  if (kind === "ranking") return "#b45309";
  if (kind === "forecast") return "#2563eb";
  return "#0f766e";
}

export function AssistantMiniCharts({ visualizations }: { visualizations: AssistantMiniVisualization[] }) {
  if (visualizations.length === 0) return null;
  return (
    <section className="mt-4 border-t border-[#edf3f0] pt-4" aria-label="الرسوم المصغرة لنتيجة البحث">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#173f3d]">
            <BarChart3 className="h-4 w-4 text-[#0f766e]" />
            قراءة بصرية للبيانات المعتمدة
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">مرّر المؤشر فوق النقاط أو الأعمدة لعرض السنة والقيمة الدقيقة.</p>
        </div>
        <Badge variant="outline" className="border-[#b9d7cf] text-[#0f766e]">مصدر داخلي معتمد</Badge>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {visualizations.map((visualization) => {
          const color = chartColor(visualization.kind);
          const isRanking = visualization.kind === "ranking";
          return (
            <article key={visualization.id} className="rounded-xl border border-[#dcebe5] bg-[#f8fcfa] p-3" aria-label={visualization.title}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="flex items-center gap-1.5 text-xs font-bold text-[#173f3d]">
                    <span style={{ color }}>{chartIcon(visualization.kind)}</span>
                    {visualization.title}
                  </h4>
                  <p className="mt-1 text-[10px] leading-5 text-slate-500">{visualization.description}</p>
                </div>
                <span className="shrink-0 text-[10px] text-slate-500">{visualization.unit}</span>
              </div>
              <div className="mt-2 h-40" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  {isRanking ? (
                    <BarChart data={visualization.data} margin={{ top: 6, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e1eee9" />
                      <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 9 }} interval={0} angle={-22} textAnchor="end" height={38} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 9 }} width={36} />
                      <Tooltip formatter={(value: number | string) => [formatNumber(Number(value)), visualization.unit]} labelFormatter={(label) => `الموقع: ${label}`} />
                      <Bar dataKey="value" name="القيمة" fill={color} radius={[4, 4, 0, 0]} isAnimationActive animationDuration={260} />
                    </BarChart>
                  ) : (
                    <LineChart data={visualization.data} margin={{ top: 6, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e1eee9" />
                      <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 9 }} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 9 }} width={42} />
                      <Tooltip formatter={(value: number | string) => [formatNumber(Number(value)), visualization.unit]} labelFormatter={(label) => `${visualization.kind === "forecast" ? "السنة المتوقعة" : "السنة"}: ${label}`} />
                      <Line type="monotone" dataKey="value" name={visualization.kind === "forecast" ? "التنبؤ" : "القيمة"} stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} connectNulls isAnimationActive animationDuration={260} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
