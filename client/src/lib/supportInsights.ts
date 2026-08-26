export type SupportInsightRequest = { category: "question" | "issue" | "suggestion"; subject: string; message: string };

const categoryLabels = { question: "استفسارات", issue: "مشكلات", suggestion: "اقتراحات" } as const;
const stopWords = new Set(["هذا", "هذه", "الذي", "التي", "على", "الى", "إلى", "من", "في", "عن", "مع", "بعد", "قبل", "عند", "كيف", "هل", "ما", "لم", "لن", "لا", "تم", "أو", "او", "ثم", "أن", "ان", "لقد", "هناك", "يرجى", "مشكلة", "طلب", "الدعم", "المنصة", "المستخدم", "البيانات"]);

export function buildSupportInsights(requests: SupportInsightRequest[]) {
  const categoryCounts = (Object.keys(categoryLabels) as (keyof typeof categoryLabels)[]).map((category) => ({ name: categoryLabels[category], count: requests.filter((item) => item.category === category).length }));
  const terms = new Map<string, number>();
  for (const request of requests) {
    for (const term of `${request.subject} ${request.message}`.toLocaleLowerCase("ar-LY").match(/[A-Za-z\u0600-\u06FF]{3,}/g) ?? []) {
      if (!stopWords.has(term)) terms.set(term, (terms.get(term) ?? 0) + 1);
    }
  }
  const commonTerms = Array.from(terms.entries()).filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ar")).slice(0, 8).map(([name, count]) => ({ name, count }));
  return { categoryCounts, commonTerms };
}
