export type SpatialLocationSearchItem = {
  id: number;
  code: string;
  name: string;
  type: "region" | "city";
  parentId: number | null;
  parentName: string | null;
};

export type SpatialLocationSearchFilters = {
  query: string;
  type: "all" | "region" | "city";
  regionId: string;
};

export function filterSpatialLocations(items: SpatialLocationSearchItem[], filters: SpatialLocationSearchFilters) {
  const normalizedQuery = filters.query.trim().toLocaleLowerCase("ar");
  return items.filter((location) => {
    const matchesType = filters.type === "all" || location.type === filters.type;
    const matchesRegion = filters.regionId === "all"
      || (location.type === "region" ? String(location.id) === filters.regionId : String(location.parentId) === filters.regionId);
    const searchable = `${location.name} ${location.code} ${location.parentName ?? ""}`.toLocaleLowerCase("ar");
    return matchesType && matchesRegion && (!normalizedQuery || searchable.includes(normalizedQuery));
  });
}
