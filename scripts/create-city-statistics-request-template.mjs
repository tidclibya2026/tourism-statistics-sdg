import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const input = "/tmp/spatial-overview-response.json";
const outputDirectory = "/home/ubuntu/generated_reports";
const output = path.join(outputDirectory, "نموذج_طلب_بيانات_المدن_السياحية_لقسم_الإحصاء.xlsx");

if (!fs.existsSync(input)) throw new Error(`Missing spatial overview export: ${input}`);
fs.mkdirSync(outputDirectory, { recursive: true });

const response = JSON.parse(fs.readFileSync(input, "utf8"));
const overview = response?.result?.data?.json;
if (!overview?.cities || !overview?.observations) throw new Error("Spatial overview response has an unexpected shape.");

const indicators = [
  { field: "الخدمات", name: "مرافق الإيواء العاملة", code: "SPATIAL-ACCOMMODATION-FACILITIES", unit: "مرفق", requestedPeriod: "2014–2025", requirement: "سنة مدنية كاملة لكل مدينة؛ يفضّل سلسلة سنوية متصلة." },
  { field: "الخدمات", name: "الغرف في مرافق الإيواء", code: "SPATIAL-ACCOMMODATION-ROOMS", unit: "غرفة", requestedPeriod: "2014–2025", requirement: "سنة مدنية كاملة لكل مدينة؛ لا تجمع مدناً متعددة في قيمة واحدة." },
  { field: "الخدمات", name: "الأسرة في مرافق الإيواء", code: "SPATIAL-ACCOMMODATION-BEDS", unit: "سرير", requestedPeriod: "2014–2025", requirement: "سنة مدنية كاملة لكل مدينة؛ مع تحديد تعريف السرير المستخدم في المصدر." },
  { field: "العمالة", name: "العمالة في مرافق الإيواء", code: "SPATIAL-ACCOMMODATION-EMPLOYMENT", unit: "عامل", requestedPeriod: "2014–2025", requirement: "عدد العاملين في مدينة وسنة محددتين؛ مع تعريف نطاق العاملين." },
  { field: "الزوار", name: "الزوار القادمين", code: "HIST-VISITORS-TOTAL", unit: "زائر", requestedPeriod: "2014–2025", requirement: "عدد الزوار المنسوبين للمدينة فقط؛ لا يستخدم الإجمالي الوطني كقيمة مدنية." },
  { field: "السياح", name: "سياح المبيت/السياح المقيمون", code: "HIST-TOURISTS-OVERNIGHT", unit: "سائح", requestedPeriod: "2014–2025", requirement: "عدد سياح المبيت أو السياح وفق تعريف المصدر؛ يوثق التعريف في الملاحظات." },
  { field: "المرشدون", name: "المرشدون السياحيون", code: "HIST-TOURISM-GUIDES", unit: "مرشد", requestedPeriod: "2011–2025", requirement: "عدد مرشدين منسوب لمدينة وسنة محددتين؛ يرجى أيضاً تأكيد 2009 و2010 إن توفرت." },
  { field: "الشركات والمكاتب", name: "الشركات والمكاتب السياحية", code: "HIST-TOURISM-BUSINESSES-COMBINED", unit: "منشأة", requestedPeriod: "2014–2025", requirement: "يفصل الشركات عن المكاتب إن نشر المصدر ذلك؛ وإلا يوضح أن القيمة مجمعة." },
  { field: "المواقع", name: "المواقع السياحية الموثقة", code: "SPATIAL-TOURISM-SITES-COUNT", unit: "موقع", requestedPeriod: "2014–2025", requirement: "عدد مواقع سياحية فريدة، موثقة رسمياً، داخل حدود المدينة والسنة المحددة." },
  { field: "الاستثمار", name: "قيمة الاستثمار السياحي", code: "SPATIAL-TOURISM-INVESTMENT-LYD", unit: "دينار ليبي", requestedPeriod: "2014–2025", requirement: "قيمة سنوية لمدينة محددة بالدينار الليبي؛ توضح هل هي منفذة أم معتمدة أم تحت التنفيذ." },
];

const latestByCityIndicator = new Map();
for (const observation of overview.observations) {
  const key = `${observation.areaId}:${observation.indicatorCode}`;
  const current = latestByCityIndicator.get(key);
  if (!current || observation.year > current.year) latestByCityIndicator.set(key, observation);
}

function platformStatus(city, indicator) {
  const available = latestByCityIndicator.get(`${city.id}:${indicator.code}`);
  if (available) return `متاح: ${available.year} (${available.value} ${available.unit})`;
  if (indicator.code === "HIST-TOURISM-GUIDES") return "لا توجد قيمة معتمدة منشورة؛ توجد مسودات موثقة 2009–2010 لخمس مدن بانتظار المراجعة.";
  if (indicator.code === "SPATIAL-TOURISM-SITES-COUNT" || indicator.code === "SPATIAL-TOURISM-INVESTMENT-LYD") return "لا توجد قيمة مدنية سنوية معتمدة في المنصة.";
  return "لا توجد قيمة مدنية سنوية معتمدة في المنصة.";
}

function requestStatus(city, indicator) {
  const available = latestByCityIndicator.get(`${city.id}:${indicator.code}`);
  return available ? "مطلوب سنة مدنية رسمية ثانية على الأقل" : "مطلوب أول قياس مدني سنوي رسمي";
}

const requestRows = overview.cities.flatMap((city, cityIndex) => indicators.map((indicator, indicatorIndex) => ({
  "م": cityIndex * indicators.length + indicatorIndex + 1,
  "رمز المدينة": city.code,
  "المدينة": city.name,
  "المجال": indicator.field,
  "المؤشر المطلوب": indicator.name,
  "رمز المؤشر في المنصة": indicator.code,
  "الوحدة المطلوبة": indicator.unit,
  "الحالة الحالية في المنصة": platformStatus(city, indicator),
  "نوع الفجوة": requestStatus(city, indicator),
  "النطاق السنوي المطلوب": indicator.requestedPeriod,
  "السنة المقدمة": "",
  "القيمة المقدمة": "",
  "الفترة": "سنوي كامل",
  "المصدر الرسمي / اسم التقرير": "",
  "رقم الجدول أو الصفحة": "",
  "رقم المرجع أو الرابط": "",
  "تاريخ نشر المصدر": "",
  "الجهة المزودة": "قسم الإحصاء",
  "مسؤول الإدخال": "",
  "ملاحظات ومنهجية": "",
  "شرط القبول": indicator.requirement,
  "حالة الاستكمال": "ناقص",
})));

const gapSummary = indicators.map((indicator) => {
  const availableCities = overview.cities.filter((city) => latestByCityIndicator.has(`${city.id}:${indicator.code}`)).length;
  return {
    "المجال": indicator.field,
    "المؤشر": indicator.name,
    "رمز المؤشر": indicator.code,
    "الوحدة": indicator.unit,
    "مدن لها قيمة معتمدة حالياً": availableCities,
    "مدن تحتاج بيانات": overview.cities.length - availableCities,
    "النطاق المطلوب": indicator.requestedPeriod,
    "أولوية الإحالة": indicator.code === "SPATIAL-TOURISM-SITES-COUNT" || indicator.code === "SPATIAL-TOURISM-INVESTMENT-LYD" ? "عالية جداً" : availableCities > 0 ? "عالية" : "عالية",
    "مطلوب من قسم الإحصاء": indicator.requirement,
  };
});

const cityRegister = overview.cities.map((city, index) => {
  const observations = overview.observations.filter((item) => item.areaId === city.id);
  const years = observations.map((item) => item.year);
  return {
    "م": index + 1,
    "رمز المدينة": city.code,
    "اسم المدينة المعتمد": city.name,
    "قياسات سنوية معتمدة حالياً": observations.length,
    "أول سنة متاحة": years.length ? Math.min(...years) : "",
    "آخر سنة متاحة": years.length ? Math.max(...years) : "",
    "ملاحظة الإحالة": observations.length ? "تحتاج سنة مدنية ثانية أو سلسلة محدثة." : "لا توجد قياسات مدنية معتمدة؛ تعطى أولوية للتعبئة." ,
  };
});

const instructions = [
  ["نموذج طلب بيانات المدن السياحية — قسم الإحصاء"],
  ["الجهة الطالبة", "مركز المعلومات والتوثيق السياحي / المرصد الوطني للبيانات والإحصاءات والمؤشرات السياحية"],
  ["الغرض", "استكمال القياسات المدنية المعتمدة للمدن السياحية وإتاحة التحليل والترتيب والتنبؤ وفق البيانات الرسمية فقط."],
  ["قاعدة أساسية", "يملأ كل صف بقيمة فعلية موثقة لمدينة واحدة وسنة مدنية كاملة واحدة. لا توضع قيمة صفر للدلالة على عدم التوفر."],
  ["السنوات", "لا تقبل بيانات الربع أو النصف سنة كبديل للسنة الكاملة، ولا يختار سنة مفردة من جدول عنوانه عدة سنوات بلا عمود صريح."],
  ["المصدر", "يلزم اسم التقرير الرسمي، رقم الجدول أو الصفحة، تاريخ النشر، والجهة المزودة. يرفق الملف أو رابط رسمي قابل للتحقق حيث يتاح."],
  ["المدينة", "تستخدم أسماء المدن ورموزها كما في ورقة «سجل المدن». لا تفكك تسمية إدارية مركبة إلى مدن متعددة بلا مصدر رسمي صريح."],
  ["الوحدة", "تحافظ القيمة على وحدة المؤشر المحددة في ورقة «طلب البيانات». لا تحول العملة أو الوحدات أو تجمع فئات مختلفة من دون ملاحظة منهجية رسمية."],
  ["المواقع والاستثمار", "يشترط للمواقع: عدد مواقع فريدة موثقة داخل المدينة والسنة. ويشترط للاستثمار: قيمة سنوية مدينة محددة بالدينار الليبي مع وصف طبيعة الاستثمار."],
  ["القبول", "بعد الاستلام تدخل القياسات كمسودات موثقة، ثم تمر بمراجعة محلل مستقل، ثم اعتماد مسؤول قبل ظهورها في الخريطة أو التنبؤ."],
  ["طريقة الاستخدام", "يعيد قسم الإحصاء ورقة «طلب البيانات» بعد تعبئة أعمدة السنة والقيمة والمصدر والمرجع والملاحظات، مع بقاء الرموز والوحدات دون تعديل."],
];

const workbook = XLSX.utils.book_new();
const headerStyle = { fill: { fgColor: { rgb: "0D5B56" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, alignment: { horizontal: "center", vertical: "center", wrapText: true } };
const titleStyle = { fill: { fgColor: { rgb: "0D5B56" } }, font: { color: { rgb: "FFFFFF" }, bold: true, sz: 16 }, alignment: { horizontal: "right", vertical: "center" } };
const noteStyle = { fill: { fgColor: { rgb: "FFF7E6" } }, font: { color: { rgb: "7C4A03" } }, alignment: { horizontal: "right", vertical: "top", wrapText: true } };

function styleWorksheet(sheet, widths, headerRow = 1) {
  sheet["!cols"] = widths.map((width) => ({ wch: width }));
  sheet["!autofilter"] = { ref: sheet["!ref"] };
  sheet["!freeze"] = { xSplit: 0, ySplit: headerRow, topLeftCell: `A${headerRow + 1}`, activePane: "bottomLeft", state: "frozen" };
  sheet["!rtl"] = true;
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  for (let col = range.s.c; col <= range.e.c; col += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r: headerRow - 1, c: col })];
    if (cell) cell.s = headerStyle;
  }
}

const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
instructionsSheet["!cols"] = [{ wch: 22 }, { wch: 115 }];
instructionsSheet["!rtl"] = true;
instructionsSheet["A1"].s = titleStyle;
instructionsSheet["!merges"] = [XLSX.utils.decode_range("A1:B1")];
for (let row = 1; row < instructions.length; row += 1) {
  instructionsSheet[`A${row + 1}`].s = headerStyle;
  instructionsSheet[`B${row + 1}`].s = noteStyle;
}
instructionsSheet["!rows"] = instructions.map((_, index) => ({ hpt: index === 0 ? 28 : 42 }));

const requestSheet = XLSX.utils.json_to_sheet(requestRows);
styleWorksheet(requestSheet, [6, 22, 18, 16, 30, 34, 15, 42, 30, 17, 14, 16, 14, 38, 20, 28, 18, 18, 18, 38, 55, 16]);
const requestRange = XLSX.utils.decode_range(requestSheet["!ref"]);
for (let row = 1; row <= requestRange.e.r; row += 1) {
  for (let col = 0; col <= requestRange.e.c; col += 1) {
    const cell = requestSheet[XLSX.utils.encode_cell({ r: row, c: col })];
    if (cell) cell.s = { alignment: { horizontal: "right", vertical: "top", wrapText: true } };
  }
}
requestSheet["!dataValidation"] = [
  { sqref: `M2:M${requestRows.length + 1}`, type: "list", formula1: '"سنوي كامل"' },
  { sqref: `V2:V${requestRows.length + 1}`, type: "list", formula1: '"ناقص,مكتمل,غير متاح,قيد التحقق"' },
];

const gapsSheet = XLSX.utils.json_to_sheet(gapSummary);
styleWorksheet(gapsSheet, [20, 32, 36, 16, 25, 23, 18, 18, 75]);

const citiesSheet = XLSX.utils.json_to_sheet(cityRegister);
styleWorksheet(citiesSheet, [6, 24, 24, 28, 18, 18, 58]);

XLSX.utils.book_append_sheet(workbook, instructionsSheet, "إرشادات الإحالة");
XLSX.utils.book_append_sheet(workbook, requestSheet, "طلب البيانات");
XLSX.utils.book_append_sheet(workbook, gapsSheet, "ملخص الفجوات");
XLSX.utils.book_append_sheet(workbook, citiesSheet, "سجل المدن");

workbook.Props = { Title: "نموذج طلب بيانات المدن السياحية لقسم الإحصاء", Subject: "فجوات البيانات المدنية السياحية", Author: "مركز المعلومات والتوثيق السياحي" };
XLSX.writeFile(workbook, output, { compression: true });
console.log(JSON.stringify({ output, cities: overview.cities.length, requestRows: requestRows.length, indicators: indicators.length }, null, 2));
