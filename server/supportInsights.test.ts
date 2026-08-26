import { describe, expect, it } from "vitest";
import { buildSupportInsights } from "../client/src/lib/supportInsights";

describe("support insights", () => {
  it("يحسب الأنواع والكلمات المتكررة من الرسائل الحقيقية فقط", () => {
    const insights = buildSupportInsights([
      { category: "issue", subject: "مشكلة الاستيراد", message: "الاستيراد لا يقبل ملف المدن" },
      { category: "question", subject: "طريقة الاستيراد", message: "كيف أستورد ملف المؤشرات" },
      { category: "issue", subject: "خطأ الاستيراد", message: "الاستيراد يعرض رسالة خطأ" },
    ]);
    expect(insights.categoryCounts).toEqual(expect.arrayContaining([{ name: "مشكلات", count: 2 }, { name: "استفسارات", count: 1 }]));
    expect(insights.commonTerms).toEqual(expect.arrayContaining([{ name: "الاستيراد", count: 5 }]));
  });

  it("لا يختلق كلمات أو قيماً عند غياب الرسائل", () => {
    expect(buildSupportInsights([])).toEqual({ categoryCounts: [{ name: "استفسارات", count: 0 }, { name: "مشكلات", count: 0 }, { name: "اقتراحات", count: 0 }], commonTerms: [] });
  });
});
