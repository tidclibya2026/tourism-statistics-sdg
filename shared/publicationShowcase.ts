export type PublicationCityRecord = {
  id: number;
  areaCode: string;
  areaName: string;
  areaType: "region" | "city";
  indicatorId: number;
  indicatorCode: string;
  indicatorName: string;
  unit: string;
  year: number;
  value: number;
  source: string | null;
};

const coverageGaps = [
  { code: "SPATIAL-TOURISM-SITES-COUNT", label: "المواقع السياحية الموثقة" },
  { code: "SPATIAL-TOURISM-INVESTMENT-LYD", label: "الاستثمار السياحي السنوي" },
] as const;

export function buildPublicationShowcaseAnalytics(records: PublicationCityRecord[]) {
  const cityRecords = records.filter((record) => record.areaType === "city");
  const indicatorGroups = new Map<number, PublicationCityRecord[]>();
  const coverageGroups = new Map<number, PublicationCityRecord[]>();

  for (const record of cityRecords) {
    indicatorGroups.set(record.indicatorId, [...(indicatorGroups.get(record.indicatorId) ?? []), record]);
    coverageGroups.set(record.year, [...(coverageGroups.get(record.year) ?? []), record]);
  }

  const indicatorSeries = Array.from(indicatorGroups.values()).map((group) => {
    const exemplar = group[0]!;
    const byYear = new Map<number, PublicationCityRecord[]>();
    for (const record of group) byYear.set(record.year, [...(byYear.get(record.year) ?? []), record]);
    return {
      indicatorId: exemplar.indicatorId,
      code: exemplar.indicatorCode,
      name: exemplar.indicatorName,
      unit: exemplar.unit,
      records: group.length,
      points: Array.from(byYear.entries()).map(([year, yearRecords]) => ({
        year,
        value: yearRecords.reduce((sum, record) => sum + record.value, 0),
        records: yearRecords.length,
        cities: new Set(yearRecords.map((record) => record.areaCode)).size,
      })).sort((left, right) => left.year - right.year),
    };
  }).sort((left, right) => right.records - left.records || left.name.localeCompare(right.name, "ar"));

  const coverageByYear = Array.from(coverageGroups.entries()).map(([year, yearRecords]) => ({
    year,
    records: yearRecords.length,
    cities: new Set(yearRecords.map((record) => record.areaCode)).size,
  })).sort((left, right) => left.year - right.year);

  return {
    indicatorSeries,
    coverageByYear,
    gaps: coverageGaps.map((gap) => ({
      ...gap,
      records: cityRecords.filter((record) => record.indicatorCode === gap.code).length,
    })),
    exportRecords: cityRecords.sort((left, right) => right.year - left.year || left.areaName.localeCompare(right.areaName, "ar")),
  };
}
