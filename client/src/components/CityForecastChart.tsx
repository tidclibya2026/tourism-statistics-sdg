import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaChart, BarChart3, TrendingUp } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const all = "all";
const numberFormat = new Intl.NumberFormat("ar-LY", { maximumFractionDigits: 1 });

type CityOption = { id: number; name: string };
type IndicatorOption = { id: number; name: string; unit: string };
type ForecastResult = {
  area: { name: string };
  indicator: { name: string; unit: string };
  historicalCagr: number;
  dataQuality: string;
  history: { year: number; value: number; type: "actual" }[];
  forecast: { year: number; value: number; type: "forecast" }[];
};

export function CityForecastChart({ cities, indicators, cityId, indicatorId, horizon, onCityId, onIndicatorId, onHorizon, data, error, loading }: {
  cities: CityOption[];
  indicators: IndicatorOption[];
  cityId: string;
  indicatorId: string;
  horizon: number;
  onCityId: (value: string) => void;
  onIndicatorId: (value: string) => void;
  onHorizon: (value: number) => void;
  data?: ForecastResult;
  error?: string;
  loading?: boolean;
}) {
  const ready = cityId !== all && indicatorId !== all;
  const points = data ? [...data.history.map((point) => ({ ...point, actual: point.value })), ...data.forecast.map((point) => ({ ...point, forecast: point.value }))] : [];
  return <Card className="overflow-hidden border-[#bcd9d0] bg-white shadow-sm"><CardContent className="p-0"><div className="bg-[linear-gradient(120deg,#0d5b56,#16766d)] px-5 py-5 text-white"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h2 className="flex items-center gap-2 text-lg font-bold"><TrendingUp className="h-5 w-5 text-amber-200" />التنبؤ السياحي للمدن</h2><p className="mt-1 text-xs leading-6 text-teal-50/90">يعتمد على القياسات المدنية السنوية المعتمدة فقط، ويعرض التاريخ والتوقعات في خطين منفصلين.</p></div><Badge className="w-fit border-0 bg-white/15 text-teal-50">لا تُعرض قيم تقديرية كقياسات فعلية</Badge></div><div className="mt-4 grid gap-3 md:grid-cols-3"><Select value={cityId} onValueChange={onCityId}><SelectTrigger className="border-white/20 bg-white/10 text-white [&_svg]:text-white"><SelectValue placeholder="اختر المدينة" /></SelectTrigger><SelectContent><SelectItem value={all}>اختر مدينة</SelectItem>{cities.map((city) => <SelectItem key={city.id} value={String(city.id)}>{city.name}</SelectItem>)}</SelectContent></Select><Select value={indicatorId} onValueChange={onIndicatorId}><SelectTrigger className="border-white/20 bg-white/10 text-white [&_svg]:text-white"><SelectValue placeholder="اختر المؤشر" /></SelectTrigger><SelectContent><SelectItem value={all}>اختر مؤشراً</SelectItem>{indicators.map((indicator) => <SelectItem key={indicator.id} value={String(indicator.id)}>{indicator.name}</SelectItem>)}</SelectContent></Select><Select value={String(horizon)} onValueChange={(value) => onHorizon(Number(value))}><SelectTrigger className="border-white/20 bg-white/10 text-white [&_svg]:text-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="3">3 سنوات متوقعة</SelectItem><SelectItem value="5">5 سنوات متوقعة</SelectItem><SelectItem value="10">10 سنوات متوقعة</SelectItem></SelectContent></Select></div></div>{!ready ? <Empty message="اختر مدينة ومؤشراً لقراءة السلسلة السنوية المعتمدة وحساب التنبؤ عند كفاية البيانات." /> : loading ? <Empty message="جارٍ التحقق من السلسلة المعتمدة وحساب التنبؤ…" loading /> : error ? <Empty message={error.includes("قياسين") ? "لا توجد قياسان سنويان معتمدان على الأقل للمدينة والمؤشر المختارين؛ لذلك لم يُنشأ تنبؤ." : error} warning /> : data ? <div className="p-5"><div className="mb-4 flex flex-wrap gap-2"><Badge variant="outline" className="border-[#b8d6ce] text-[#0f766e]">{data.area.name}</Badge><Badge variant="outline" className="border-[#b8d6ce] text-[#0f766e]">{data.indicator.name}</Badge><Badge variant="outline" className="border-amber-200 text-amber-800">جودة السلسلة: {data.dataQuality}</Badge><Badge variant="outline" className="border-slate-200 text-slate-600">CAGR: {(data.historicalCagr * 100).toFixed(2)}%</Badge></div><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={points} margin={{ top: 10, right: 18, left: 5, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#e5eeeb" /><XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 12 }} /><YAxis tickFormatter={(value) => numberFormat.format(Number(value))} tick={{ fill: "#64748b", fontSize: 12 }} width={58} /><Tooltip formatter={(value: number) => `${numberFormat.format(value)} ${data.indicator.unit}`} labelFormatter={(label) => `السنة ${label}`} /><Legend /><Line type="monotone" dataKey="actual" name="قياس فعلي معتمد" stroke="#0f766e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls={false} /><Line type="monotone" dataKey="forecast" name="توقع محسوب" stroke="#c78a31" strokeWidth={3} strokeDasharray="7 6" dot={{ r: 4 }} connectNulls={false} /></LineChart></ResponsiveContainer></div><p className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900">التوقع حسابي باستخدام معدل النمو السنوي المركب بين أول وآخر قياس معتمد؛ لا يدخل في ترتيب المدن ولا في الأرشيف الفعلي.</p></div> : null}</CardContent></Card>;
}

function Empty({ message, warning, loading }: { message: string; warning?: boolean; loading?: boolean }) { const Icon = loading ? AreaChart : warning ? BarChart3 : TrendingUp; return <div className={`flex min-h-52 flex-col items-center justify-center px-6 py-10 text-center ${warning ? "bg-amber-50/50" : "bg-[#f8fbfa]"}`}><Icon className={`h-9 w-9 ${warning ? "text-amber-500" : "text-[#7faea2]"} ${loading ? "animate-pulse" : ""}`} /><p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">{message}</p></div>; }
