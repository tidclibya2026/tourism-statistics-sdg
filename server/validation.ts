export type ImportableObservationRow = {
  code?: unknown;
  year?: unknown;
  period?: unknown;
  quarter?: unknown;
  value?: unknown;
  targetValue?: unknown;
  source?: unknown;
  notes?: unknown;
};

export type NormalizedObservationRow = {
  code: string;
  year: number;
  period: "annual" | "quarterly";
  quarter: "annual" | "Q1" | "Q2" | "Q3" | "Q4";
  value: number;
  targetValue?: number;
  source?: string;
  notes?: string;
};

export type ValidationIssue = {
  rowNumber: number;
  field?: string;
  message: string;
  severity: "error" | "warning";
};

export function validateImportedObservations(
  rows: ImportableObservationRow[],
  knownIndicatorCodes: Set<string>,
): { accepted: NormalizedObservationRow[]; issues: ValidationIssue[] } {
  const accepted: NormalizedObservationRow[] = [];
  const issues: ValidationIssue[] = [];
  const uniquePeriods = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const code = String(row.code ?? "").trim();
    const year = Number(row.year);
    const period = String(row.period ?? "").trim().toLowerCase();
    const rawQuarter = String(row.quarter ?? "").trim().toUpperCase();
    const value = Number(row.value);
    const rawTarget = row.targetValue === undefined || row.targetValue === null || row.targetValue === "" ? undefined : Number(row.targetValue);
    const rowIssues: ValidationIssue[] = [];

    if (!code) rowIssues.push({ rowNumber, field: "code", message: "رمز المؤشر مطلوب.", severity: "error" });
    else if (!knownIndicatorCodes.has(code)) {
      rowIssues.push({ rowNumber, field: "code", message: `رمز المؤشر ${code} غير موجود أو غير متاح للاستيراد.`, severity: "error" });
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      rowIssues.push({ rowNumber, field: "year", message: "السنة يجب أن تكون عدداً صحيحاً بين 2000 و2100.", severity: "error" });
    }
    if (period !== "annual" && period !== "quarterly") {
      rowIssues.push({ rowNumber, field: "period", message: "الفترة يجب أن تكون annual أو quarterly.", severity: "error" });
    }
    const quarter = period === "annual" ? "annual" : rawQuarter;
    if (period === "quarterly" && !["Q1", "Q2", "Q3", "Q4"].includes(quarter)) {
      rowIssues.push({ rowNumber, field: "quarter", message: "يجب تحديد الربع Q1 أو Q2 أو Q3 أو Q4 للبيانات الربع سنوية.", severity: "error" });
    }
    if (!Number.isFinite(value)) {
      rowIssues.push({ rowNumber, field: "value", message: "قيمة المؤشر رقمية ومطلوبة.", severity: "error" });
    }
    if (rawTarget !== undefined && !Number.isFinite(rawTarget)) {
      rowIssues.push({ rowNumber, field: "targetValue", message: "القيمة المستهدفة يجب أن تكون رقمية عند إدخالها.", severity: "error" });
    }

    const uniqueKey = `${code}|${year}|${period}|${quarter}`;
    if (rowIssues.length === 0 && uniquePeriods.has(uniqueKey)) {
      rowIssues.push({ rowNumber, field: "period", message: "يوجد صف مكرر للمؤشر والسنة والفترة نفسها داخل الملف.", severity: "error" });
    }

    if (rowIssues.length > 0) {
      issues.push(...rowIssues);
      return;
    }

    uniquePeriods.add(uniqueKey);
    accepted.push({
      code,
      year,
      period: period as "annual" | "quarterly",
      quarter: quarter as "annual" | "Q1" | "Q2" | "Q3" | "Q4",
      value,
      targetValue: rawTarget,
      source: String(row.source ?? "").trim() || undefined,
      notes: String(row.notes ?? "").trim() || undefined,
    });
  });

  return { accepted, issues };
}

