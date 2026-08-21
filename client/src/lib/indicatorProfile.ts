export type IndicatorProfileSource = {
  code: string;
  axis: "اقتصادي" | "اجتماعي" | "بيئي";
  framework: "UNWTO" | "SDG";
  sdgReference: string | null;
  unit: string;
  status: "draft" | "published" | "archived";
  officialSource: string | null;
  calculationMethod: string | null;
};

export function getIndicatorProfileEntries(indicator: IndicatorProfileSource) {
  const status = indicator.status === "published" ? "منشور" : indicator.status === "draft" ? "مسودة" : "مؤرشف";
  return [
    { label: "نوع المؤشر (المحور)", value: indicator.axis },
    { label: "الإطار المرجعي", value: indicator.framework },
    { label: "مرجع SDG", value: indicator.sdgReference || "غير منطبق" },
    { label: "وحدة القياس", value: indicator.unit },
    { label: "رمز المؤشر", value: indicator.code, ltr: true },
    { label: "حالة النشر", value: status },
    { label: "المصدر الرسمي", value: indicator.officialSource || "غير محدد" },
    { label: "منهجية الاحتساب", value: indicator.calculationMethod || "غير محددة" },
  ];
}

