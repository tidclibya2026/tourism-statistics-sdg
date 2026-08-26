export const arabicNumber = new Intl.NumberFormat("ar-LY", { maximumFractionDigits: 2 });

/** تعرض السنوات كأرقام كاملة ثابتة؛ لا تستخدم فاصل الآلاف كي لا تصبح 2.025 بدلاً من 2025. */
export function formatYear(value: number | string | null | undefined) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? String(Math.trunc(numeric)) : "—";
}

export const axisMeta = {
  اقتصادي: { label: "اقتصادي", className: "bg-amber-100 text-amber-800 border-amber-200" },
  اجتماعي: { label: "اجتماعي", className: "bg-sky-100 text-sky-800 border-sky-200" },
  بيئي: { label: "بيئي", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
} as const;

export const observationStatusMeta = {
  draft: { label: "مسودة", className: "bg-slate-100 text-slate-700" },
  reviewed: { label: "قيد المراجعة", className: "bg-amber-100 text-amber-800" },
  approved: { label: "معتمد", className: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "مرفوض", className: "bg-rose-100 text-rose-800" },
} as const;

export const indicatorStatusMeta = {
  draft: "مسودة",
  published: "منشور",
  archived: "مؤرشف",
} as const;

export const roleLabels = {
  admin: "مدير النظام",
  analyst: "محلل بيانات",
  viewer: "مستعرض عام",
} as const;

export function periodLabel(period: "annual" | "quarterly", quarter: "annual" | "Q1" | "Q2" | "Q3" | "Q4") {
  if (period === "annual") return "سنوي";
  return { Q1: "الربع الأول", Q2: "الربع الثاني", Q3: "الربع الثالث", Q4: "الربع الرابع", annual: "سنوي" }[quarter];
}

export function asNumber(value: string | number | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
