import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const inputs = [
  "/tmp/new_tourism_files_index/city_2019_annual_candidates.json",
  "/tmp/new_tourism_files_index/city_2020_annual_candidates.json",
  "/tmp/new_tourism_files_index/city_2021_annual_candidates.json",
];
const output = "/home/ubuntu/generated_reports/دفعة_مدن_رسمية_2019_2021_للاستيراد_كمسودات.xlsx";
const indicators = {
  "HIST-TOURISM-COMPANIES": "الشركات السياحية",
  "HIST-TOURISM-OFFICES": "المكاتب السياحية",
  "SPATIAL-HOTELS-OPERATING": "مرافق الإيواء العاملة حسب المدينة",
  "HIST-ROOMS": "عدد الغرف الفندقية",
  "SPATIAL-ACCOMMODATION-BEDS": "عدد الأسرة في مرافق الإيواء حسب المدينة",
  "HIST-ACCOMMODATION-EMPLOYMENT": "العمالة في مرافق الإيواء",
};
const headers = [
  "رمز المدينة", "المدينة", "رمز المؤشر في المنصة", "المؤشر المطلوب", "الوحدة المطلوبة", "الفترة", "السنة المقدمة", "القيمة المقدمة", "المصدر الرسمي / اسم التقرير", "رقم الجدول أو الصفحة", "رقم المرجع أو الرابط", "تاريخ نشر المصدر", "الجهة المزودة", "ملاحظات ومنهجية", "حالة الاستكمال",
];
const datasets = inputs.map((file) => JSON.parse(fs.readFileSync(file, "utf8")));
const rows = datasets.flatMap((dataset) => dataset.candidateRows).map((row) => ({
  "رمز المدينة": row.cityCode,
  "المدينة": row.cityName,
  "رمز المؤشر في المنصة": row.indicatorCode,
  "المؤشر المطلوب": indicators[row.indicatorCode] ?? row.indicatorCode,
  "الوحدة المطلوبة": row.unit,
  "الفترة": "سنوي كامل",
  "السنة المقدمة": row.year,
  "القيمة المقدمة": row.value,
  "المصدر الرسمي / اسم التقرير": row.source,
  "رقم الجدول أو الصفحة": `${row.sourceSheet}، صف ${row.sourceRow}؛ ${row.sourceTitle}`,
  "رقم المرجع أو الرابط": `ملف مرفق رسمي: ${path.basename(row.source.split(" — ")[0])}`,
  "تاريخ نشر المصدر": "",
  "الجهة المزودة": "مركز المعلومات والتوثيق السياحي / إدارة شؤون المهن والرقابة السياحية",
  "ملاحظات ومنهجية": row.notes,
  "حالة الاستكمال": "مكتمل — مسودة تنتظر المراجعة",
}));
const unmatched = datasets.flatMap((dataset) => dataset.unmatchedCities.map((name) => ({ السنة: dataset.year, "التسمية في المصدر": name, "سبب الاستبعاد": "لا يوجد تعريف مدينة مطابق في السجل الحالي؛ لم تُجزّأ أو تُحوّل إلى مدينة بديلة.", "الإجراء المطلوب": "إضافة تعريف مدينة مرجعي مستقل أو تقديم مرادف رسمي قبل الاستيراد." })));

const workbook = XLSX.utils.book_new();
const instructions = [
  ["دفعة مدن رسمية 2019–2021 — استيراد كمـسودات فقط"],
  ["الغرض", "استيراد قياسات سنوية مدنية صريحة من جداول الخدمات والإيواء حسب المدن في تقارير 2019 و2020 وتقرير 2021."],
  ["عدد الصفوف", rows.length],
  ["الحوكمة", "يرفع الملف من مستخدم analyst أو admin؛ ينشئ النظام مسودات فقط؛ يلزم مراجعة محلل مستقل ثم اعتماد مسؤول قبل ظهور القيم في الخريطة."],
  ["المواقع والاستثمار", "غير مدرجين: لا يوجد جدول مدني سنوي صريح مطابق لتعريف المواقع السياحية الموثقة أو قيمة الاستثمار السياحي."],
  ["التسميات غير المطابقة", "في ورقة «تسميات تحتاج قراراً» ولا تدخل تلقائياً."],
];
const instructionSheet = XLSX.utils.aoa_to_sheet(instructions);
const dataSheet = XLSX.utils.json_to_sheet(rows, { header: headers });
const unmatchedSheet = XLSX.utils.json_to_sheet(unmatched);
for (const sheet of [instructionSheet, dataSheet, unmatchedSheet]) sheet["!rtl"] = true;
instructionSheet["!cols"] = [{ wch: 25 }, { wch: 115 }];
dataSheet["!cols"] = headers.map((header) => ({ wch: header.includes("ملاحظات") || header.includes("المصدر") || header.includes("الجدول") ? 52 : 21 }));
unmatchedSheet["!cols"] = [{ wch: 12 }, { wch: 24 }, { wch: 58 }, { wch: 58 }];
XLSX.utils.book_append_sheet(workbook, instructionSheet, "إرشادات الدفعة");
XLSX.utils.book_append_sheet(workbook, dataSheet, "طلب البيانات");
XLSX.utils.book_append_sheet(workbook, unmatchedSheet, "تسميات تحتاج قراراً");
XLSX.writeFile(workbook, output, { compression: true });
console.log(JSON.stringify({ output, rows: rows.length, unmatched: unmatched.length, years: [...new Set(rows.map((row) => row["السنة المقدمة"]))] }, null, 2));
