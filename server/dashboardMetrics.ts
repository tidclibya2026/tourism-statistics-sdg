type PerformanceRow = {
  indicator: { id: number; name: string; code: string; axis: "اقتصادي" | "اجتماعي" | "بيئي"; unit: string };
  observation: { year: number; period: "annual" | "quarterly"; value: string; targetValue: string | null };
};

export type TargetPerformance = {
  indicatorId: number;
  name: string;
  code: string;
  axis: "اقتصادي" | "اجتماعي" | "بيئي";
  unit: string;
  year: number;
  actual: number;
  target: number;
  variance: number;
  attainment: number;
  status: "achieved" | "below_target";
};

export function buildTargetPerformance(rows: PerformanceRow[]): TargetPerformance[] {
  const latestByIndicator = new Map<number, PerformanceRow>();
  for (const row of rows) {
    if (row.observation.period !== "annual" || row.observation.targetValue === null) continue;
    const actual = Number(row.observation.value);
    const target = Number(row.observation.targetValue);
    if (!Number.isFinite(actual) || !Number.isFinite(target) || target === 0) continue;
    const existing = latestByIndicator.get(row.indicator.id);
    if (!existing || row.observation.year > existing.observation.year) latestByIndicator.set(row.indicator.id, row);
  }

  return Array.from(latestByIndicator.values()).map((row) => {
    const actual = Number(row.observation.value);
    const target = Number(row.observation.targetValue);
    const attainment = Math.round((actual / target) * 1000) / 10;
    const status: TargetPerformance["status"] = attainment >= 100 ? "achieved" : "below_target";
    return {
      indicatorId: row.indicator.id,
      name: row.indicator.name,
      code: row.indicator.code,
      axis: row.indicator.axis,
      unit: row.indicator.unit,
      year: row.observation.year,
      actual,
      target,
      variance: actual - target,
      attainment,
      status,
    };
  }).sort((a, b) => a.attainment - b.attainment || a.name.localeCompare(b.name, "ar"));
}
