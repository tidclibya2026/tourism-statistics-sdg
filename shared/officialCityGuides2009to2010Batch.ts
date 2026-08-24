export const officialCityGuides2009to2010IndicatorCode = "HIST-TOURISM-GUIDES";
export const officialCityGuides2009to2010Years = [2009, 2010] as const;
export const officialCityGuides2009to2010Sources = [
  "التقرير الإحصائي لسنة 2009، جدول إحصائية المرشدين السياحيين إلى نهاية السنة، صادر عن مركز المعلومات والتوثيق السياحي",
  "التقرير الإحصائي لسنة 2010، جدول إحصائية المرشدين السياحيين إلى نهاية السنة، صادر عن مركز المعلومات والتوثيق السياحي",
] as const;

export function isOfficialCityGuides2009to2010Batch(row: { indicatorCode?: string; year: number; period: string; quarter: string; source: string | null }) {
  return row.indicatorCode === officialCityGuides2009to2010IndicatorCode
    && officialCityGuides2009to2010Years.includes(row.year as typeof officialCityGuides2009to2010Years[number])
    && row.period === "annual"
    && row.quarter === "annual"
    && officialCityGuides2009to2010Sources.some((source) => source === row.source);
}
