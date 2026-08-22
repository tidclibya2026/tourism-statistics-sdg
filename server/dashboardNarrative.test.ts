import { describe, expect, it } from "vitest";
import { buildDashboardNarrativePrompt, dashboardNarrativeSystemPrompt } from "./dashboardNarrative";

describe("dashboard AI narrative input", () => {
  it("passes only the filtered dashboard summaries and explicitly distinguishes coverage from performance", () => {
    const prompt = buildDashboardNarrativePrompt({
      summary: { totalIndicators: 4, publishedIndicators: 3, approvedObservations: 15, latestYear: 2025, indicatorsWithTargets: 2, achievedTargets: 1 },
      trendByYear: [{ year: 2024, observations: 5 }, { year: 2025, observations: 10 }],
      targetPerformance: [{ name: "الوافدون", code: "ARR", axis: "اقتصادي", unit: "عدد", year: 2025, actual: 80, target: 100, variance: -20, attainment: 80, status: "below_target" }],
    }, { year: 2025, sdgReference: "SDG 8" });

    expect(prompt).toContain('"sdgReference":"SDG 8"');
    expect(prompt).toContain('"attainment":80');
    expect(dashboardNarrativeSystemPrompt).toContain("عدد القياسات المعتمدة فقط");
  });
});

