import { describe, expect, it } from "vitest";
import { buildCityRankings } from "../shared/cityRankings";

describe("city tourism rankings", () => {
  const cities = [{ id: 1, name: "طرابلس", code: "CITY-TRIPOLI" }, { id: 2, name: "بنغازي", code: "CITY-BENGHAZI" }];
  const indicators = [{ id: 3, code: "HIST-ARRIVALS-TOTAL", name: "إجمالي السياح القادمين", unit: "عدد" }, { id: 4, code: "HIST-TOURISM-GUIDES", name: "المرشدون السياحيون", unit: "عدد" }];

  it("ranks each category using only its mapped indicator and the latest city observation", () => {
    const rankings = buildCityRankings(cities, indicators, [
      { areaId: 1, areaType: "city" as const, indicatorId: 3, year: 2024, value: 120 },
      { areaId: 1, areaType: "city" as const, indicatorId: 3, year: 2025, value: 180 },
      { areaId: 2, areaType: "city" as const, indicatorId: 3, year: 2025, value: 220 },
      { areaId: 1, areaType: "city" as const, indicatorId: 4, year: 2025, value: 9 },
    ]);
    const tourists = rankings.find((item) => item.id === "tourists")!;
    const guides = rankings.find((item) => item.id === "guides")!;
    const investment = rankings.find((item) => item.id === "investment")!;
    expect(tourists.items).toEqual([{ cityId: 2, cityName: "بنغازي", cityCode: "CITY-BENGHAZI", value: 220, year: 2025 }, { cityId: 1, cityName: "طرابلس", cityCode: "CITY-TRIPOLI", value: 180, year: 2025 }]);
    expect(guides.items).toHaveLength(1);
    expect(investment.indicator).toBeNull();
    expect(investment.items).toEqual([]);
  });
});
