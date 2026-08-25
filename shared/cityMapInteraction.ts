export type CityComparisonSelection = {
  primary: string;
  secondary: string;
};

export type CityComparisonPoint = {
  id: number;
  areaId: number;
  areaName: string;
  indicatorId: number;
  year: number;
  value: number;
  unit: string;
};

export const cityMapQueryDefaults = {
  staleTime: 5 * 60 * 1000,
  gcTime: 15 * 60 * 1000,
  refetchInterval: 2 * 60 * 1000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

export function addCityToComparison(selection: CityComparisonSelection, cityId: number): CityComparisonSelection {
  const city = String(cityId);
  if (selection.primary === city || selection.secondary === city) return selection;
  if (selection.primary === "all") return { ...selection, primary: city };
  if (selection.secondary === "all") return { ...selection, secondary: city };
  return { primary: selection.secondary, secondary: city };
}

export function selectComparisonPoint(
  points: CityComparisonPoint[],
  areaId: string,
  indicatorId: string,
  year: string,
): CityComparisonPoint | undefined {
  if (areaId === "all" || indicatorId === "all") return undefined;
  const cityId = Number(areaId);
  const selectedIndicator = Number(indicatorId);
  return points
    .filter((point) => point.areaId === cityId && point.indicatorId === selectedIndicator)
    .filter((point) => year === "all" || point.year === Number(year))
    .sort((a, b) => b.year - a.year || b.id - a.id)[0];
}
