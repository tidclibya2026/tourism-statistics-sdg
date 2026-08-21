export type HistoricalPoint = { year: number; value: number };
export type ForecastMethod = "historical_cagr" | "custom_rate";

export function calculateAnnualForecast(input: {
  history: HistoricalPoint[];
  horizon: number;
  method: ForecastMethod;
  customRate?: number;
}) {
  const history = [...input.history]
    .filter((point) => Number.isFinite(point.value))
    .sort((a, b) => a.year - b.year)
    .filter((point, index, points) => index === 0 || point.year !== points[index - 1]?.year);

  if (history.length < 2) {
    throw new Error("يتطلب التنبؤ قياسين سنويين معتمدين على الأقل.");
  }

  const first = history[0]!;
  const last = history[history.length - 1]!;
  if (first.value <= 0 || last.value <= 0) {
    throw new Error("يتطلب حساب معدل النمو المركب قيماً موجبة في أول وآخر سنة تاريخية.");
  }

  const historicalCagr = Math.pow(last.value / first.value, 1 / (last.year - first.year)) - 1;
  const appliedRate = input.method === "custom_rate" ? input.customRate ?? Number.NaN : historicalCagr;
  if (!Number.isFinite(appliedRate)) {
    throw new Error("معدل النمو المحدد غير صالح.");
  }

  const forecast = Array.from({ length: input.horizon }, (_, index) => ({
    year: last.year + index + 1,
    value: last.value * Math.pow(1 + appliedRate, index + 1),
    type: "forecast" as const,
  }));

  return {
    method: input.method,
    historicalCagr,
    appliedRate,
    baseYear: last.year,
    baseValue: last.value,
    history: history.map((point) => ({ ...point, type: "actual" as const })),
    forecast,
    dataQuality: history.length >= 6 ? "مرتفع" : history.length >= 3 ? "متوسط" : "محدود",
  };
}
