export type CityImportIssue = {
  rowNumber: number;
  field?: string;
  message: string;
  severity: "error" | "warning";
};

export type ImportedCityStatistic = {
  cityCode: string;
  indicatorCode: string;
  year: number;
  value: number;
  unit: string;
  sourceTitle: string;
  tableOrPage: string;
  reference: string;
  publicationDate?: string;
  provider?: string;
  notes?: string;
};

export type CityImportKnownIndicator = { id: number; code: string; unit: string };
export type CityImportKnownCity = { id: number; code: string; type: "city" | "region"; status: "active" | "archived" };

const field = (row: Record<string, unknown>, key: string) => String(row[key] ?? "").trim();
const hasSubmission = (row: Record<string, unknown>) => ["السنة المقدمة", "القيمة المقدمة", "المصدر الرسمي / اسم التقرير", "رقم الجدول أو الصفحة", "رقم المرجع أو الرابط"].some((key) => field(row, key) !== "");

export function validateImportedCityStatistics(
  rows: Record<string, unknown>[],
  knownCities: CityImportKnownCity[],
  knownIndicators: CityImportKnownIndicator[],
): { accepted: ImportedCityStatistic[]; issues: CityImportIssue[]; ignoredRows: number } {
  const cityByCode = new Map(knownCities.map((city) => [city.code, city]));
  const indicatorByCode = new Map(knownIndicators.map((indicator) => [indicator.code, indicator]));
  const accepted: ImportedCityStatistic[] = [];
  const issues: CityImportIssue[] = [];
  const uniqueKeys = new Set<string>();
  let ignoredRows = 0;

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    if (!hasSubmission(row)) {
      ignoredRows += 1;
      return;
    }
    const cityCode = field(row, "رمز المدينة").toUpperCase();
    const indicatorCode = field(row, "رمز المؤشر في المنصة").toUpperCase();
    const year = Number(field(row, "السنة المقدمة"));
    const value = Number(field(row, "القيمة المقدمة"));
    const unit = field(row, "الوحدة المطلوبة");
    const period = field(row, "الفترة").toLowerCase();
    const sourceTitle = field(row, "المصدر الرسمي / اسم التقرير");
    const tableOrPage = field(row, "رقم الجدول أو الصفحة");
    const reference = field(row, "رقم المرجع أو الرابط");
    const publicationDate = field(row, "تاريخ نشر المصدر");
    const provider = field(row, "الجهة المزودة");
    const notes = field(row, "ملاحظات ومنهجية");
    const rowIssues: CityImportIssue[] = [];
    const city = cityByCode.get(cityCode);
    const indicator = indicatorByCode.get(indicatorCode);

    if (!cityCode) rowIssues.push({ rowNumber, field: "رمز المدينة", message: "رمز المدينة مطلوب.", severity: "error" });
    else if (!city || city.type !== "city" || city.status !== "active") rowIssues.push({ rowNumber, field: "رمز المدينة", message: `رمز المدينة ${cityCode} غير موجود أو غير نشط في سجل المدن.`, severity: "error" });
    if (!indicatorCode) rowIssues.push({ rowNumber, field: "رمز المؤشر في المنصة", message: "رمز المؤشر مطلوب.", severity: "error" });
    else if (!indicator) rowIssues.push({ rowNumber, field: "رمز المؤشر في المنصة", message: `رمز المؤشر ${indicatorCode} غير منشور أو غير متاح للاستيراد المدني.`, severity: "error" });
    if (!Number.isInteger(year) || year < 1994 || year > 2100) rowIssues.push({ rowNumber, field: "السنة المقدمة", message: "السنة يجب أن تكون سنة مدنية صحيحة بين 1994 و2100.", severity: "error" });
    if (!Number.isFinite(value)) rowIssues.push({ rowNumber, field: "القيمة المقدمة", message: "القيمة الرقمية مطلوبة ولا يقبل الفراغ أو النص.", severity: "error" });
    if (period !== "سنوي كامل" && period !== "annual") rowIssues.push({ rowNumber, field: "الفترة", message: "يقبل الاستيراد المدني السنة الكاملة فقط؛ لا تقبل البيانات الفصلية أو النصف سنوية هنا.", severity: "error" });
    if (!unit) rowIssues.push({ rowNumber, field: "الوحدة المطلوبة", message: "وحدة القياس مطلوبة.", severity: "error" });
    else if (indicator && unit !== indicator.unit) rowIssues.push({ rowNumber, field: "الوحدة المطلوبة", message: `وحدة الملف (${unit}) لا تطابق وحدة المؤشر المنشورة (${indicator.unit}).`, severity: "error" });
    if (!sourceTitle) rowIssues.push({ rowNumber, field: "المصدر الرسمي / اسم التقرير", message: "اسم المصدر الرسمي أو التقرير مطلوب.", severity: "error" });
    if (!tableOrPage) rowIssues.push({ rowNumber, field: "رقم الجدول أو الصفحة", message: "رقم الجدول أو الصفحة مطلوب لتتبع القيمة.", severity: "error" });
    if (!reference) rowIssues.push({ rowNumber, field: "رقم المرجع أو الرابط", message: "رقم المرجع أو الرابط الرسمي مطلوب.", severity: "error" });
    const duplicateKey = `${cityCode}|${indicatorCode}|${year}`;
    if (rowIssues.length === 0 && uniqueKeys.has(duplicateKey)) rowIssues.push({ rowNumber, field: "السنة المقدمة", message: "يوجد صف مكرر للمدينة والمؤشر والسنة نفسها داخل الملف.", severity: "error" });
    if (rowIssues.length > 0) {
      issues.push(...rowIssues);
      return;
    }
    uniqueKeys.add(duplicateKey);
    accepted.push({ cityCode, indicatorCode, year, value, unit, sourceTitle, tableOrPage, reference, publicationDate: publicationDate || undefined, provider: provider || undefined, notes: notes || undefined });
  });
  return { accepted, issues, ignoredRows };
}
