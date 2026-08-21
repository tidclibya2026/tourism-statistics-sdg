export type DataEntryForm = {
  indicatorId: string;
  year: string;
  period: "annual" | "quarterly";
  quarter: string;
  value: string;
  targetValue: string;
  source: string;
  notes: string;
};

export function createObservationPayload(form: DataEntryForm) {
  return {
    indicatorId: Number(form.indicatorId),
    year: Number(form.year),
    period: form.period,
    quarter: form.period === "annual" ? "annual" as const : form.quarter as "Q1" | "Q2" | "Q3" | "Q4",
    value: Number(form.value),
    targetValue: form.targetValue === "" ? null : Number(form.targetValue),
    source: form.source || undefined,
    notes: form.notes || undefined,
  };
}

