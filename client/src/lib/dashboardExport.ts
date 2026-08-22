export type TargetPerformance = {
  code: string;
  name: string;
  axis: string;
  unit: string;
  year: number;
  actual: number;
  target: number;
  variance: number;
  attainment: number;
  status: "achieved" | "below_target";
};

export type DashboardExportData = {
  summary: { totalIndicators: number; publishedIndicators: number; approvedObservations: number; latestYear: number | null; indicatorsWithTargets: number; achievedTargets: number };
  trendByYear: { year: number; observations: number }[];
  axisDistribution: { axis: string; count: number }[];
  targetPerformance: TargetPerformance[];
};

export function toDashboardExportSheets(data: DashboardExportData, generatedAt = new Date().toLocaleString("ar-LY")) {
  return {
    "ملخص اللوحة": [
      { البند: "تاريخ التصدير", القيمة: generatedAt },
      { البند: "إجمالي المؤشرات", القيمة: data.summary.totalIndicators },
      { البند: "المؤشرات المنشورة", القيمة: data.summary.publishedIndicators },
      { البند: "القياسات المعتمدة", القيمة: data.summary.approvedObservations },
      { البند: "آخر سنة بيانات", القيمة: data.summary.latestYear ?? "" },
      { البند: "مؤشرات لها أهداف", القيمة: data.summary.indicatorsWithTargets },
      { البند: "أهداف محققة", القيمة: data.summary.achievedTargets },
    ],
    "تحقيق المستهدفات": data.targetPerformance.map((item) => ({
      "رمز المؤشر": item.code,
      المؤشر: item.name,
      المحور: item.axis,
      السنة: item.year,
      "القيمة الفعلية": item.actual,
      المستهدف: item.target,
      الفجوة: item.variance,
      "نسبة التحقيق %": item.attainment,
      الوحدة: item.unit,
      الحالة: item.status === "achieved" ? "محقق" : "دون المستهدف",
    })),
    "بيانات الرسوم": data.trendByYear.map((item) => ({ السنة: item.year, "القياسات السنوية المعتمدة": item.observations })),
    "توزيع المحاور": data.axisDistribution.map((item) => ({ المحور: item.axis, "عدد المؤشرات": item.count })),
  };
}
