type HistoricalRow = {
  observation: { year: number; value: string | number; verificationStatus: "draft" | "reviewed" | "approved" | "rejected"; source: string | null; period: "annual" | "quarterly"; quarter: "annual" | "Q1" | "Q2" | "Q3" | "Q4" };
  indicator: { id: number; code: string; name: string; unit: string; axis: "اقتصادي" | "اجتماعي" | "بيئي"; framework: "UNWTO" | "SDG"; sdgReference: "SDG 8" | "SDG 11" | "SDG 12" | "SDG 14" | "SDG 17" | null };
};

export function summarizeHistoricalArchive(rows: HistoricalRow[]) {
  const annual = rows.filter((row) => row.observation.period === "annual" && row.observation.quarter === "annual");
  const years = Array.from(new Set(annual.map((row) => row.observation.year))).sort((a, b) => a - b);
  const coverage = years.map((year) => {
    const yearRows = annual.filter((row) => row.observation.year === year);
    return {
      year,
      observations: yearRows.length,
      indicators: new Set(yearRows.map((row) => row.indicator.id)).size,
      reviewed: yearRows.filter((row) => row.observation.verificationStatus === "reviewed").length,
      approved: yearRows.filter((row) => row.observation.verificationStatus === "approved").length,
    };
  });
  const spanYears = years.length ? (years.at(-1)! - years[0] + 1) : 0;
  const sources = Array.from(new Set(annual.map((row) => row.observation.source).filter((source): source is string => Boolean(source)))).sort();
  return {
    summary: {
      observations: annual.length,
      indicators: new Set(annual.map((row) => row.indicator.id)).size,
      firstYear: years[0] ?? null,
      lastYear: years.at(-1) ?? null,
      documentedYears: years.length,
      spanYears,
      gapYears: spanYears - years.length,
      reviewed: annual.filter((row) => row.observation.verificationStatus === "reviewed").length,
      approved: annual.filter((row) => row.observation.verificationStatus === "approved").length,
    },
    coverage,
    sources,
  };
}
