import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL غير متاح؛ تعذر استيراد التقارير الرسمية.");

const publisherUrl = "https://tidc.com.ly/releases.php?page=1";
const publisher = "مركز المعلومات والتوثيق السياحي";
const indicators = [
  ["HIST-TOURIST-VILLAGES", "عدد القرى السياحية", "اقتصادي", "SDG", "SDG 8", "عدد", "عدد القرى السياحية العاملة."],
  ["HIST-HOTEL-APARTMENTS", "عدد الشقق الفندقية", "اقتصادي", "SDG", "SDG 8", "عدد", "عدد الشقق الفندقية العاملة."],
  ["HIST-TOURISM-BUSINESSES-COMBINED", "الشركات والمكاتب السياحية", "اقتصادي", "SDG", "SDG 8", "عدد", "إجمالي الشركات والمكاتب حين ينشر المصدر القيمة المجمعة فقط."],
  ["HIST-ACCOMMODATION-GUESTS", "إجمالي النزلاء في مرافق الإيواء", "اقتصادي", "UNWTO", null, "عدد", "إجمالي النزلاء في مرافق الإيواء وفق التقرير الرسمي."],
  ["HIST-INTERNATIONAL-TOURISTS", "عدد السياح الدوليين", "اقتصادي", "UNWTO", null, "عدد", "عدد السياح الدوليين وفق التقرير الرسمي."],
  ["HIST-TOURISM-RESTAURANTS-CAFES", "المطاعم والمقاهي السياحية", "اقتصادي", "SDG", "SDG 8", "عدد", "إجمالي المطاعم والمقاهي في القطاع السياحي."],
  ["HIST-TOURISM-GUIDES", "المرشدون السياحيون", "اجتماعي", "SDG", "SDG 8", "عدد", "عدد المرشدين السياحيين المعتمدين أو المسجلين."],
];

const reports = [
  { year: 2023, title: "إحصائيات ومؤشرات سياحية لسنة 2023", rows: [
    ["HIST-HOTELS", 324, 4, "عدد الفنادق"],
    ["HIST-ROOMS", 17659, 4, "عدد الغرف"],
    ["HIST-BEDS", 43898, 4, "عدد الأسرة"],
    ["HIST-TOURIST-VILLAGES", 104, 4, "عدد القرى السياحية"],
    ["HIST-TOURISM-COMPANIES", 2202, 8, "شركات السفر والسياحة"],
    ["HIST-TOURISM-OFFICES", 130, 8, "مكاتب السفر والسياحة"],
    ["HIST-TOURISM-RESTAURANTS-CAFES", 2229, 7, "إجمالي المطاعم والمقاهي"],
    ["HIST-TOURISM-GUIDES", 318, 9, "إجمالي المرشدين: الفئتان أ وب"],
  ]},
  { year: 2025, title: "التقرير الإحصائي للقطاع السياحي لسنة 2025", rows: [
    ["HIST-ACCOMMODATION-GUESTS", 373843, 3, "إجمالي النزلاء في مرافق الإيواء"],
    ["HIST-INTERNATIONAL-TOURISTS", 2752, 3, "عدد السياح الدوليين"],
    ["HIST-ACCOMMODATION-FACILITIES", 642, 5, "عدد مرافق الإيواء السياحي"],
    ["HIST-HOTELS", 384, 5, "عدد الفنادق"],
    ["HIST-HOTEL-APARTMENTS", 258, 5, "عدد الشقق الفندقية"],
    ["HIST-ROOMS", 21821, 5, "عدد الغرف الفندقية"],
    ["HIST-BEDS", 75606, 5, "عدد الأسرة بالفنادق"],
    ["HIST-TOURIST-VILLAGES", 134, 6, "عدد القرى السياحية"],
    ["HIST-TOURISM-BUSINESSES-COMBINED", 2556, 7, "عدد الشركات والمكاتب السياحية"],
    ["HIST-TOURISM-RESTAURANTS-CAFES", 3300, 9, "عدد المطاعم والمقاهي"],
  ]},
];

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const [admins] = await connection.query("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1");
  const verifierId = admins[0]?.id ?? null;
  for (const [code, name, axis, framework, sdgReference, unit, description] of indicators) {
    await connection.query(
      "INSERT INTO indicators (code, name, description, axis, framework, sdgReference, unit, calculationMethod, officialSource, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published') ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), axis=VALUES(axis), framework=VALUES(framework), sdgReference=VALUES(sdgReference), unit=VALUES(unit), officialSource=VALUES(officialSource), status='published'",
      [code, name, description, axis, framework, sdgReference, unit, "سلسلة سنوية موثقة من تقرير رسمي صادر عن مركز المعلومات والتوثيق السياحي.", `${publisher} — ${publisherUrl}`],
    );
  }
  let observations = 0;
  for (const report of reports) {
    for (const [code, value, page, label] of report.rows) {
      const note = `مصدر موثق: ${publisher} — ${report.title}، ص.${page} — ${label}. تحقق الإسناد: ${publisherUrl}. تم الاعتماد بطلب من مالك المنظومة.`;
      await connection.query(
        "INSERT INTO indicatorObservations (indicatorId, year, period, quarter, value, source, notes, verificationStatus, verifiedBy, verifiedAt) SELECT id, ?, 'annual', 'annual', ?, ?, ?, 'approved', ?, NOW() FROM indicators WHERE code = ? ON DUPLICATE KEY UPDATE value=VALUES(value), source=VALUES(source), notes=VALUES(notes), verificationStatus='approved', verifiedBy=VALUES(verifiedBy), verifiedAt=NOW()",
        [report.year, value, `${publisher} — ${report.title}`, note, verifierId, code],
      );
      observations += 1;
    }
  }
  console.log(JSON.stringify({ publisher, verifierId, annualReports: reports.map((report) => report.year), observations }, null, 2));
} finally {
  await connection.end();
}
