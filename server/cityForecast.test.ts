import { describe, expect, it } from "vitest";
import { calculateAnnualForecast } from "./forecast";

describe("التنبؤ المدني", () => {
  it("يفصل القياسات الفعلية عن التوقعات بعد آخر سنة معتمدة", () => {
    const result = calculateAnnualForecast({ history: [{ year: 2013, value: 100 }, { year: 2015, value: 121 }], horizon: 2, method: "historical_cagr" });
    expect(result.history).toEqual([{ year: 2013, value: 100, type: "actual" }, { year: 2015, value: 121, type: "actual" }]);
    expect(result.forecast.map((point) => point.year)).toEqual([2016, 2017]);
    expect(result.forecast.every((point) => point.type === "forecast")).toBe(true);
  });

  it("يرفض إنشاء توقع عندما لا تتوافر إلا سنة مدنية معتمدة واحدة", () => {
    expect(() => calculateAnnualForecast({ history: [{ year: 2013, value: 130 }], horizon: 3, method: "historical_cagr" })).toThrow("قياسين سنويين معتمدين");
  });
});
