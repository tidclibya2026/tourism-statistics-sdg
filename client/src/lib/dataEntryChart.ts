export type HistoricalPoint = { year: number; value: number; target?: number };
export type ForecastPoint = { year: number; value: number };

export function buildDataEntryChartSeries(history: HistoricalPoint[], forecast: ForecastPoint[] = []) {
  const series = new Map<number, { year: number; actual?: number; target?: number; forecast?: number }>();
  for (const point of history) {
    series.set(point.year, { year: point.year, actual: point.value, target: point.target });
  }
  for (const point of forecast) {
    series.set(point.year, { ...(series.get(point.year) ?? { year: point.year }), forecast: point.value });
  }
  return Array.from(series.values()).sort((a, b) => a.year - b.year);
}

