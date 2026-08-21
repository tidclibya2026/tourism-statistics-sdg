export type UnitKind = "percentage" | "count" | "amount" | "quantity";

export function getUnitRule(unit?: string | null) {
  const normalized = (unit ?? "").trim().toLowerCase();
  if (/(%|٪|نسبة مئوية|percentage|percent)/.test(normalized)) {
    return { kind: "percentage" as const, step: "0.01", min: 0, max: 100, hint: "وحدة نسبة مئوية: تُقبل القيم من 0 إلى 100." };
  }
  if (/(عدد|زائر|سائح|نزيل|منشأة|غرفة|وظيفة|رحلة|visitor|tourist|arrival|count|room|establishment)/.test(normalized)) {
    return { kind: "count" as const, step: "1", min: 0, hint: "وحدة عدد: أدخل قيمة صحيحة غير سالبة." };
  }
  if (/(د\.ل|دينار|ليبي|دولار|usd|eur|currency|عملة)/.test(normalized)) {
    return { kind: "amount" as const, step: "0.01", min: 0, hint: "قيمة مالية: تُقبل القيم غير السالبة حتى منزلتين عشريتين." };
  }
  return { kind: "quantity" as const, step: "0.01", min: 0, hint: "أدخل قيمة رقمية غير سالبة متوافقة مع وحدة القياس." };
}

export function validateUnitValue(unit: string | null | undefined, value: number | null | undefined, label: string) {
  if (value === null || value === undefined) return undefined;
  if (!Number.isFinite(value)) return `${label} يجب أن تكون قيمة رقمية صحيحة.`;
  const rule = getUnitRule(unit);
  if (value < 0) return `${label} لا يمكن أن تكون سالبة وفق وحدة القياس «${unit || "غير محددة"}».`;
  if (rule.kind === "percentage" && value > 100) return `${label} تتجاوز الحد الأقصى 100 لأن وحدة القياس نسبة مئوية.`;
  if (rule.kind === "count" && !Number.isInteger(value)) return `${label} يجب أن تكون عدداً صحيحاً لأن وحدة القياس «${unit}».`;
  return undefined;
}

export function validateUnitValues(unit: string | null | undefined, value: number, targetValue?: number | null) {
  return [
    validateUnitValue(unit, value, "القيمة"),
    validateUnitValue(unit, targetValue, "القيمة المستهدفة"),
  ].filter((message): message is string => Boolean(message));
}

