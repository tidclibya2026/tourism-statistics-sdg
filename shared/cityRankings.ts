export type CityRankingCategory = {
  id: "services" | "sites" | "visitors" | "tourists" | "guides" | "employment" | "businesses" | "investment";
  label: string;
  description: string;
  indicatorCode: string | null;
};

export const cityRankingCategories: CityRankingCategory[] = [
  { id: "services", label: "الخدمات السياحية", description: "المطاعم والمقاهي السياحية", indicatorCode: "HIST-TOURISM-RESTAURANTS-CAFES" },
  { id: "sites", label: "المواقع السياحية", description: "يتطلب مؤشراً مكانياً منشوراً للمواقع", indicatorCode: null },
  { id: "visitors", label: "الزوار والنزلاء", description: "إجمالي النزلاء في مرافق الإيواء", indicatorCode: "HIST-ACCOMMODATION-GUESTS" },
  { id: "tourists", label: "السياح", description: "إجمالي السياح القادمين", indicatorCode: "HIST-ARRIVALS-TOTAL" },
  { id: "guides", label: "المرشدون", description: "المرشدون السياحيون", indicatorCode: "HIST-TOURISM-GUIDES" },
  { id: "employment", label: "العمالة", description: "العمالة في مرافق الإيواء", indicatorCode: "HIST-ACCOMMODATION-EMPLOYMENT" },
  { id: "businesses", label: "الشركات والمكاتب", description: "الشركات والمكاتب السياحية", indicatorCode: "HIST-TOURISM-BUSINESSES-COMBINED" },
  { id: "investment", label: "الاستثمار السياحي", description: "يتطلب مؤشراً مالياً منشوراً للاستثمار", indicatorCode: null },
];

type City = { id: number; name: string; code: string };
type Indicator = { id: number; code: string; name: string; unit: string };
type Observation = { areaId: number; areaType: "city" | "region"; indicatorId: number; year: number; value: number };

export function buildCityRankings(cities: City[], indicators: Indicator[], observations: Observation[]) {
  return cityRankingCategories.map((category) => {
    const indicator = category.indicatorCode ? indicators.find((item) => item.code === category.indicatorCode) ?? null : null;
    if (!indicator) return { ...category, indicator: null, unit: null, items: [] as { cityId: number; cityName: string; cityCode: string; value: number; year: number }[] };
    const latestByCity = new Map<number, Observation>();
    observations.filter((item) => item.areaType === "city" && item.indicatorId === indicator.id).forEach((item) => {
      const current = latestByCity.get(item.areaId);
      if (!current || item.year > current.year) latestByCity.set(item.areaId, item);
    });
    const cityById = new Map(cities.map((city) => [city.id, city]));
    const items = Array.from(latestByCity.values())
      .map((item) => ({ city: cityById.get(item.areaId), value: item.value, year: item.year }))
      .filter((item): item is { city: City; value: number; year: number } => Boolean(item.city))
      .map((item) => ({ cityId: item.city.id, cityName: item.city.name, cityCode: item.city.code, value: item.value, year: item.year }))
      .sort((a, b) => b.value - a.value || b.year - a.year || a.cityName.localeCompare(b.cityName, "ar"));
    return { ...category, indicator: { id: indicator.id, code: indicator.code, name: indicator.name }, unit: indicator.unit, items };
  });
}
