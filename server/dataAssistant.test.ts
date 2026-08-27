import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.hoisted(() => vi.fn());
const dbMock = vi.hoisted(() => ({
  getDashboardData: vi.fn(),
  getSpatialOverview: vi.fn(),
  listObservations: vi.fn(),
  listIndicators: vi.fn(),
}));

vi.mock("./_core/llm", () => ({ invokeLLM: invokeMock }));
vi.mock("./db", () => dbMock);

import { answerDataQuestion, buildDataAssistantContext, isDataAssistantQuestionAllowed } from "./dataAssistant";

describe("data assistant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.getDashboardData.mockResolvedValue({
      summary: { totalIndicators: 1, publishedIndicators: 1, approvedObservations: 2, latestYear: 2025, indicatorsWithTargets: 0, achievedTargets: 0 },
      availableYears: [2025, 2024],
      latest: [{ indicator: { id: 1, name: "إجمالي الزوار", unit: "عدد" }, observation: { year: 2025, value: "100" } }],
      indicatorGrowth: [],
      indicators: [{ id: 1, name: "إجمالي الزوار", unit: "عدد" }],
    });
    dbMock.listIndicators.mockResolvedValue([{ id: 1, code: "HIST-VISITORS", name: "إجمالي الزوار", axis: "اقتصادي", unit: "عدد", status: "published" }]);
    dbMock.listObservations.mockResolvedValue([
      { observation: { period: "annual", quarter: "annual", year: 2024, value: "80", source: "تقرير رسمي", verificationStatus: "approved" }, indicator: { id: 1, code: "HIST-VISITORS", name: "إجمالي الزوار", axis: "اقتصادي", unit: "عدد" } },
      { observation: { period: "annual", quarter: "annual", year: 2025, value: "100", source: "تقرير رسمي", verificationStatus: "approved" }, indicator: { id: 1, code: "HIST-VISITORS", name: "إجمالي الزوار", axis: "اقتصادي", unit: "عدد" } },
    ]);
    dbMock.getSpatialOverview.mockResolvedValue({ summary: { regions: 0, cities: 1, approvedObservations: 1, latestYear: 2025 }, availableYears: [2025], observations: [{ areaName: "طرابلس", areaType: "city", indicatorId: 1, indicatorCode: "HIST-VISITORS", indicatorName: "إجمالي الزوار", unit: "عدد", year: 2025, value: 100, source: "تقرير رسمي" }] });
  });

  it("يبني السياق من السجلات السنوية المعتمدة فقط ويطلب نوع البيانات الصحيح", async () => {
    const context = await buildDataAssistantContext({ axis: "اقتصادي", scope: "all" });
    expect(dbMock.listObservations).toHaveBeenCalledWith({ status: "approved" });
    expect(context.national.approvedAnnualRows).toHaveLength(2);
    expect(context.spatial.approvedAnnualRows[0]).toMatchObject({ municipalityOrCity: "طرابلس", value: 100 });
    expect(context.forecasts.every((row) => row.type === "forecast")).toBe(true);
    expect(context.visualizations.length).toBeGreaterThan(0);
    expect(context.visualizations[0].data.every((point) => Number.isFinite(point.value))).toBe(true);
    expect(JSON.stringify(context)).not.toContain("draft");
  });

  it("يرسل للموديل سياسة المصدر الواحد وسياقاً رقمياً محدوداً", async () => {
    invokeMock.mockResolvedValue({ choices: [{ message: { content: "ارتفعت قيمة إجمالي الزوار من 80 إلى 100." } }] });
    const result = await answerDataQuestion({ question: "ما اتجاه الزوار؟", history: [], axis: "اقتصادي", scope: "national" });
    expect(result.answer).toContain("ارتفعت");
    expect(result.context.visualizations.length).toBeGreaterThan(0);
    expect(invokeMock).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5-mini", maxTokens: 1200 }));
    const call = invokeMock.mock.calls[0][0];
    expect(call.messages[0].content).toContain("لا تستخدم معلومات خارجية");
    expect(call.messages[1].content).toContain("approvedAnnualRows");
  });

  it("يرفض الأسئلة الفارغة أو الأطول من الحد المعلن", () => {
    expect(isDataAssistantQuestionAllowed(" ")).toBe(false);
    expect(isDataAssistantQuestionAllowed("سؤال صالح عن المؤشرات")).toBe(true);
    expect(isDataAssistantQuestionAllowed("x".repeat(1201))).toBe(false);
  });
});
