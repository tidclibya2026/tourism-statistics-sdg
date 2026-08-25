import { allYearsFilter } from "./publicationChartInteractions";

export const allCitiesFilter = "all";

export type PublicationRecord = {
  areaCode: string;
  areaName: string;
  indicatorCode: string;
  indicatorName: string;
  unit: string;
  year: number;
  value: number;
  source: string | null;
};

export type PublicationViewFilters = { year: string; cityCode: string; indicatorCode: string };

export function getPublicationCities(records: PublicationRecord[]) {
  return Array.from(new Map(records.map((record) => [record.areaCode, { code: record.areaCode, name: record.areaName }])).values()).sort((left, right) => left.name.localeCompare(right.name, "ar"));
}

export function filterPublicationRecords(records: PublicationRecord[], filters: PublicationViewFilters) {
  return records.filter((record) =>
    (filters.year === allYearsFilter || record.year === Number(filters.year)) &&
    (filters.cityCode === allCitiesFilter || record.areaCode === filters.cityCode) &&
    (!filters.indicatorCode || record.indicatorCode === filters.indicatorCode),
  );
}

export function buildPublicationSeries(records: PublicationRecord[], filters: PublicationViewFilters) {
  const grouped = new Map<number, PublicationRecord[]>();
  for (const record of filterPublicationRecords(records, filters)) grouped.set(record.year, [...(grouped.get(record.year) ?? []), record]);
  return Array.from(grouped.entries()).map(([year, yearRecords]) => ({
    year,
    value: yearRecords.reduce((total, record) => total + record.value, 0),
    records: yearRecords.length,
    cities: new Set(yearRecords.map((record) => record.areaCode)).size,
  })).sort((left, right) => left.year - right.year);
}

export function buildPublicationCoverage(records: PublicationRecord[], filters: Pick<PublicationViewFilters, "year" | "cityCode">) {
  const grouped = new Map<number, PublicationRecord[]>();
  for (const record of records.filter((item) => (filters.year === allYearsFilter || item.year === Number(filters.year)) && (filters.cityCode === allCitiesFilter || item.areaCode === filters.cityCode))) grouped.set(record.year, [...(grouped.get(record.year) ?? []), record]);
  return Array.from(grouped.entries()).map(([year, yearRecords]) => ({ year, records: yearRecords.length, cities: new Set(yearRecords.map((record) => record.areaCode)).size })).sort((left, right) => left.year - right.year);
}

export function searchAndSortPublicationRecords(records: PublicationRecord[], query: string, sort: "city" | "indicator" | "year" | "value", direction: "asc" | "desc") {
  const normalizedQuery = query.trim().toLocaleLowerCase("ar");
  const multiplier = direction === "asc" ? 1 : -1;
  return records.filter((record) => !normalizedQuery || [record.areaName, record.areaCode, record.indicatorName, record.indicatorCode, record.source ?? ""].some((value) => value.toLocaleLowerCase("ar").includes(normalizedQuery))).sort((left, right) => {
    const values = sort === "city" ? [left.areaName, right.areaName] : sort === "indicator" ? [left.indicatorName, right.indicatorName] : sort === "year" ? [left.year, right.year] : [left.value, right.value];
    return (typeof values[0] === "number" ? Number(values[0]) - Number(values[1]) : String(values[0]).localeCompare(String(values[1]), "ar")) * multiplier;
  });
}
