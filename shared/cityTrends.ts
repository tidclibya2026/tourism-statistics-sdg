export type TrendCity = { id: number; name: string };
export type TrendObservation = { areaId: number; areaType: "city" | "region"; year: number; value: number; unit: string };

export function buildCityTrendSeries(cities: TrendCity[], observations: TrendObservation[]) {
  const cityById = new Map(cities.map((city) => [city.id, city]));
  const byYear = new Map<number, TrendObservation[]>();
  observations.filter((row) => row.areaType === "city").forEach((row) => byYear.set(row.year, [...(byYear.get(row.year) ?? []), row]));
  return {
    years: Array.from(byYear.keys()).sort((a, b) => a - b),
    series: Array.from(byYear.entries()).flatMap(([year, rows]) => rows
      .sort((a, b) => b.value - a.value || (cityById.get(a.areaId)?.name ?? "").localeCompare(cityById.get(b.areaId)?.name ?? "", "ar"))
      .map((row, index) => ({ year, rank: index + 1, cityId: row.areaId, cityName: cityById.get(row.areaId)?.name ?? "مدينة غير معرّفة", value: row.value, unit: row.unit }))),
  };
}
