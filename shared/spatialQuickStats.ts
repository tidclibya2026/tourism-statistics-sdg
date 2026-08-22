export type LocationQuickStat = {
  count: number;
  latestYear: number | null;
  latestValue: number | null;
  unit: string | null;
  indicatorName: string | null;
};

type Location = { id: number; type: "region" | "city"; parentId: number | null };
type Observation = { areaId: number; year: number; value: number; unit: string; indicatorName: string };

export function buildLocationQuickStats(locations: Location[], cities: Location[], observations: Observation[]) {
  const summaries = new Map<number, LocationQuickStat>();
  locations.forEach((location) => {
    const linkedAreaIds = location.type === "region"
      ? [location.id, ...cities.filter((city) => city.parentId === location.id).map((city) => city.id)]
      : [location.id];
    const rows = observations.filter((row) => linkedAreaIds.includes(row.areaId)).sort((a, b) => b.year - a.year);
    const latest = rows[0];
    summaries.set(location.id, { count: rows.length, latestYear: latest?.year ?? null, latestValue: latest?.value ?? null, unit: latest?.unit ?? null, indicatorName: latest?.indicatorName ?? null });
  });
  return summaries;
}
