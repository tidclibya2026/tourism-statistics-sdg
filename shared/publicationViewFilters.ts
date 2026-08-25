import { allYearsFilter } from "./publicationChartInteractions";

export const allCitiesFilter = "all";
export type PublicationRankDirection = "descending" | "ascending";

export function getPublicationRankingMethod(indicator: { code: string; name: string; unit: string }) {
  const normalized = `${indicator.code} ${indicator.name}`.toLocaleLowerCase("ar");
  const lowerIsBetter = ["نفايات", "انبعاث", "بطالة", "حوادث", "مخالفات", "إغلاق", "خسائر"].some((term) => normalized.includes(term));
  return lowerIsBetter
    ? { direction: "ascending" as const, label: "الأدنى قيمة أولاً", rationale: "هذا المؤشر يقيس عبئاً أو أثراً سلبياً؛ القيمة الأقل تمنح رتبة أفضل." }
    : { direction: "descending" as const, label: "الأعلى قيمة أولاً", rationale: `هذا المؤشر يقيس حجماً أو طاقة أو استثماراً سياحياً بوحدة ${indicator.unit}؛ القيمة الأعلى تمنح رتبة أفضل.` };
}

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

export function summarizePublicationValueRange(records: PublicationRecord[], filters: PublicationViewFilters) {
  if (!filters.cityCode || filters.cityCode === allCitiesFilter || !filters.indicatorCode) return null;
  const matched = filterPublicationRecords(records, filters);
  if (!matched.length) return null;
  const ascending = [...matched].sort((left, right) => left.value - right.value || left.year - right.year);
  return { minimum: ascending[0], maximum: ascending[ascending.length - 1], records: matched.length };
}

export function buildCityComparisonSeries(records: PublicationRecord[], input: { year: string; indicatorCode: string; primaryCityCode: string; comparisonCityCode: string }) {
  const primary = buildPublicationSeries(records, { year: input.year, indicatorCode: input.indicatorCode, cityCode: input.primaryCityCode });
  const comparison = buildPublicationSeries(records, { year: input.year, indicatorCode: input.indicatorCode, cityCode: input.comparisonCityCode });
  const byYear = new Map<number, { year: number; primaryValue?: number; comparisonValue?: number }>();
  primary.forEach((item) => byYear.set(item.year, { ...(byYear.get(item.year) ?? { year: item.year }), primaryValue: item.value }));
  comparison.forEach((item) => byYear.set(item.year, { ...(byYear.get(item.year) ?? { year: item.year }), comparisonValue: item.value }));
  return Array.from(byYear.values()).sort((left, right) => left.year - right.year);
}

export function calculateCityDifference(primaryValue?: number, comparisonValue?: number) {
  if (primaryValue === undefined || comparisonValue === undefined) return null;
  const difference = primaryValue - comparisonValue;
  return { difference, percentage: comparisonValue === 0 ? null : (difference / Math.abs(comparisonValue)) * 100 };
}

export function addCityComparisonDifferences(points: ReturnType<typeof buildCityComparisonSeries>) {
  return points.map((point) => ({ ...point, ...calculateCityDifference(point.primaryValue, point.comparisonValue) }));
}

export function getPublicationCityRank(records: PublicationRecord[], input: { year: string; indicatorCode: string; cityCode: string; direction?: PublicationRankDirection }) {
  if (!input.cityCode || input.cityCode === allCitiesFilter || !input.indicatorCode) return null;
  const cityHistory = records.filter((record) => record.areaCode === input.cityCode && record.indicatorCode === input.indicatorCode && (input.year === allYearsFilter || record.year === Number(input.year)));
  const target = [...cityHistory].sort((left, right) => right.year - left.year)[0];
  if (!target) return null;
  const sameScope = records.filter((record) => record.indicatorCode === target.indicatorCode && record.unit === target.unit && record.year === target.year);
  const cityValues = Array.from(new Map(sameScope.map((record) => [record.areaCode, record])).values());
  const rank = 1 + cityValues.filter((record) => input.direction === "ascending" ? record.value < target.value : record.value > target.value).length;
  return { rank, total: cityValues.length, year: target.year, value: target.value, unit: target.unit };
}

export function buildPublicationCityRankHistory(records: PublicationRecord[], input: { indicatorCode: string; cityCode: string; direction?: PublicationRankDirection }) {
  if (!input.cityCode || input.cityCode === allCitiesFilter || !input.indicatorCode) return [];
  const selectedByYear = new Map<number, PublicationRecord>();
  records.filter((record) => record.areaCode === input.cityCode && record.indicatorCode === input.indicatorCode).forEach((record) => selectedByYear.set(record.year, record));
  return Array.from(selectedByYear.values()).map((target) => {
    const scoped = records.filter((record) => record.indicatorCode === target.indicatorCode && record.unit === target.unit && record.year === target.year);
    const cityValues = Array.from(new Map(scoped.map((record) => [record.areaCode, record])).values());
    return { year: target.year, rank: 1 + cityValues.filter((record) => input.direction === "ascending" ? record.value < target.value : record.value > target.value).length, total: cityValues.length, value: target.value, unit: target.unit };
  }).sort((left, right) => left.year - right.year);
}

export function buildPublicationTopCitiesByYear(records: PublicationRecord[], input: { indicatorCode: string; unit: string; year: string; direction: PublicationRankDirection; limit?: number }) {
  if (!input.indicatorCode || !input.unit) return [];
  const byYear = new Map<number, PublicationRecord[]>();
  records.filter((record) => record.indicatorCode === input.indicatorCode && record.unit === input.unit && (input.year === allYearsFilter || record.year === Number(input.year))).forEach((record) => byYear.set(record.year, [...(byYear.get(record.year) ?? []), record]));
  return Array.from(byYear.entries()).sort(([left], [right]) => right - left).map(([year, yearRecords]) => {
    const cities = Array.from(new Map(yearRecords.map((record) => [record.areaCode, record])).values()).sort((left, right) => input.direction === "ascending" ? left.value - right.value : right.value - left.value);
    return { year, cities: cities.slice(0, input.limit ?? 5).map((record, index) => ({ rank: 1 + cities.slice(0, index).filter((candidate) => candidate.value !== record.value).length, areaCode: record.areaCode, areaName: record.areaName, value: record.value, unit: record.unit })) };
  });
}

export function assessComparisonThreshold(percentage: number | null | undefined, threshold: number | null) {
  if (percentage === undefined || percentage === null || threshold === null) return { available: false, exceeded: false, magnitude: null };
  const magnitude = Math.abs(percentage);
  return { available: true, exceeded: magnitude > threshold, magnitude };
}

export function buildCityCoverageComparison(records: PublicationRecord[], input: { year: string; primaryCityCode: string; comparisonCityCode: string }) {
  const primary = buildPublicationCoverage(records, { year: input.year, cityCode: input.primaryCityCode });
  const comparison = buildPublicationCoverage(records, { year: input.year, cityCode: input.comparisonCityCode });
  const byYear = new Map<number, { year: number; primaryRecords?: number; comparisonRecords?: number }>();
  primary.forEach((item) => byYear.set(item.year, { ...(byYear.get(item.year) ?? { year: item.year }), primaryRecords: item.records }));
  comparison.forEach((item) => byYear.set(item.year, { ...(byYear.get(item.year) ?? { year: item.year }), comparisonRecords: item.records }));
  return Array.from(byYear.values()).sort((left, right) => left.year - right.year);
}

export function getCityComparisonRecords(records: PublicationRecord[], filters: Omit<PublicationViewFilters, "cityCode"> & { primaryCityCode: string; comparisonCityCode: string }) {
  return records.filter((record) =>
    (filters.year === allYearsFilter || record.year === Number(filters.year)) &&
    (!filters.indicatorCode || record.indicatorCode === filters.indicatorCode) &&
    [filters.primaryCityCode, filters.comparisonCityCode].includes(record.areaCode),
  );
}

export function searchAndSortPublicationRecords(records: PublicationRecord[], query: string, sort: "city" | "indicator" | "year" | "value", direction: "asc" | "desc") {
  const normalizedQuery = query.trim().toLocaleLowerCase("ar");
  const multiplier = direction === "asc" ? 1 : -1;
  return records.filter((record) => !normalizedQuery || [record.areaName, record.areaCode, record.indicatorName, record.indicatorCode, record.source ?? ""].some((value) => value.toLocaleLowerCase("ar").includes(normalizedQuery))).sort((left, right) => {
    const values = sort === "city" ? [left.areaName, right.areaName] : sort === "indicator" ? [left.indicatorName, right.indicatorName] : sort === "year" ? [left.year, right.year] : [left.value, right.value];
    return (typeof values[0] === "number" ? Number(values[0]) - Number(values[1]) : String(values[0]).localeCompare(String(values[1]), "ar")) * multiplier;
  });
}
