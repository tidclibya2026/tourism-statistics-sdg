export type YearlyPublicationPoint = { year: number };

export const allYearsFilter = "all";

export function getPublicationAvailableYears(...groups: YearlyPublicationPoint[][]) {
  return Array.from(new Set(groups.flatMap((group) => group.map((item) => item.year)))).sort((left, right) => right - left);
}

export function filterPublicationYear<T extends YearlyPublicationPoint>(points: T[], selectedYear: string) {
  if (selectedYear === allYearsFilter) return points;
  const year = Number(selectedYear);
  return Number.isInteger(year) ? points.filter((point) => point.year === year) : points;
}
