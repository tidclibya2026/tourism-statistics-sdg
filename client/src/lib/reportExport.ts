import { asNumber, periodLabel } from "./tourism";

type ReportItem = {
  indicator: {
    code: string;
    name: string;
    axis: "اقتصادي" | "اجتماعي" | "بيئي";
    framework: "UNWTO" | "SDG";
    sdgReference: "SDG 8" | "SDG 11" | "SDG 12" | "SDG 14" | "SDG 17" | null;
    unit: string;
  };
  observation: {
    year: number;
    period: "annual" | "quarterly";
    quarter: "annual" | "Q1" | "Q2" | "Q3" | "Q4";
    value: string | number;
    targetValue: string | number | null;
    source: string | null;
  };
};

export function toExcelReportRows(items: ReportItem[]) {
  return items.map((item) => ({
    "رمز المؤشر": item.indicator.code,
    المؤشر: item.indicator.name,
    المحور: item.indicator.axis,
    الإطار: item.indicator.framework,
    "مرجع SDG": item.indicator.sdgReference ?? "",
    السنة: item.observation.year,
    الفترة: periodLabel(item.observation.period, item.observation.quarter),
    القيمة: asNumber(item.observation.value),
    "وحدة القياس": item.indicator.unit,
    "القيمة المستهدفة": item.observation.targetValue === null ? "" : asNumber(item.observation.targetValue),
    المصدر: item.observation.source ?? "",
  }));
}

