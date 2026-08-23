export const officialCityAccommodation2013Source = "التقرير الإحصائي للأقاليم الأربعة 2014–2016، جدول مرافق الإيواء العاملة حسب المدن لسنة 2013، صادر عن مركز المعلومات والتوثيق السياحي";
export const officialCityAccommodation2013Year = 2013;

export function isOfficialCityAccommodation2013Batch(row: { year: number; period: string; quarter: string; source: string | null }) {
  return row.year === officialCityAccommodation2013Year
    && row.period === "annual"
    && row.quarter === "annual"
    && row.source === officialCityAccommodation2013Source;
}
