export type ComparisonIndicator = { id: number; name: string; unit: string };
export type ComparisonAnnualRow = { indicatorId: number; year: number; value: number };
export type ComparisonPoint = Record<string, number> & { year: number };

function orderedYears(rows: ComparisonAnnualRow[]) {
  return Array.from(new Set(rows.map((row) => row.year))).sort((left, right) => left - right);
}

export function areUnitsComparable(indicators: ComparisonIndicator[]) {
  return indicators.length > 0 && indicators.every((indicator) => indicator.unit === indicators[0]?.unit);
}

export function buildActualComparisonSeries(indicators: ComparisonIndicator[], rows: ComparisonAnnualRow[]): ComparisonPoint[] {
  return orderedYears(rows).map((year) => {
    const point: ComparisonPoint = { year };
    indicators.forEach((indicator) => {
      const row = rows.find((item) => item.indicatorId === indicator.id && item.year === year);
      if (row) point[indicator.name] = row.value;
    });
    return point;
  });
}

export function buildIndexedComparisonSeries(indicators: ComparisonIndicator[], rows: ComparisonAnnualRow[]): ComparisonPoint[] {
  const baselines = new Map<number, number>();
  indicators.forEach((indicator) => {
    const first = rows.filter((row) => row.indicatorId === indicator.id).sort((left, right) => left.year - right.year)[0];
    if (first && first.value > 0) baselines.set(indicator.id, first.value);
  });
  return orderedYears(rows).map((year) => {
    const point: ComparisonPoint = { year };
    indicators.forEach((indicator) => {
      const row = rows.find((item) => item.indicatorId === indicator.id && item.year === year);
      const baseline = baselines.get(indicator.id);
      if (row && baseline) point[indicator.name] = Number(((row.value / baseline) * 100).toFixed(2));
    });
    return point;
  });
}

export function summarizeComparisonSeries(indicators: ComparisonIndicator[], rows: ComparisonAnnualRow[]) {
  return indicators.map((indicator) => {
    const series = rows.filter((row) => row.indicatorId === indicator.id).sort((left, right) => left.year - right.year);
    const first = series[0];
    const last = series.at(-1);
    const changePercent = first && last && first.value !== 0 ? ((last.value - first.value) / Math.abs(first.value)) * 100 : null;
    return { indicator, first, last, changePercent };
  });
}
