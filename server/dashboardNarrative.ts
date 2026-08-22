export type DashboardNarrativeData = {
  summary: { totalIndicators: number; publishedIndicators: number; approvedObservations: number; latestYear: number | null; indicatorsWithTargets: number; achievedTargets: number };
  trendByYear: { year: number; observations: number }[];
  targetPerformance: { name: string; code: string; axis: string; unit: string; year: number; actual: number; target: number; variance: number; attainment: number; status: "achieved" | "below_target" }[];
};

export type DashboardNarrativeFilters = { year?: number; axis?: string; framework?: string; sdgReference?: string };

export function buildDashboardNarrativePrompt(data: DashboardNarrativeData, filters: DashboardNarrativeFilters) {
  return JSON.stringify({
    scope: {
      year: filters.year ?? "كل السنوات",
      axis: filters.axis ?? "كل المحاور",
      framework: filters.framework ?? "كل الأطر",
      sdgReference: filters.sdgReference ?? "كل أهداف التنمية المستدامة",
    },
    summary: data.summary,
    measurementCoverageByYear: data.trendByYear.slice(-12),
    performanceAgainstTargets: data.targetPerformance.slice(0, 12),
  });
}

export const dashboardNarrativeSystemPrompt = `أنت محلل إحصاءات سياحية حكومي تكتب بالعربية الفصحى. اكتب تقريراً مختصراً ومنظماً من 3 إلى 5 فقرات بعنوانين فرعيين: «الملخص التنفيذي» و«الأداء مقابل المستهدفات» و«ملاحظات جودة البيانات». استخدم حصراً البيانات المقدمة. لا تخترع أرقاماً أو اتجاهات. بيانات measurementCoverageByYear تمثل عدد القياسات المعتمدة فقط، وليست تغيراً في قيمة المؤشرات. اذكر بوضوح إن كانت البيانات غير كافية. لا تقدم توصيات سياسية أو تنبؤات جديدة.`;

