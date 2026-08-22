import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL غير متاح؛ تعذر اعتماد الأرشيف التاريخي.");

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const verificationUrl = "https://tidc.com.ly/releases.php?page=1";
const verificationNote = `مصدر موثق: مركز المعلومات والتوثيق السياحي — ${verificationUrl} — اعتماد بطلب من مالك المنظومة.`;

try {
  const [admins] = await connection.query("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1");
  const verifierId = admins[0]?.id ?? null;
  const [result] = await connection.query(
    "UPDATE indicatorObservations o INNER JOIN indicators i ON i.id = o.indicatorId SET o.verificationStatus = 'approved', o.verifiedBy = ?, o.verifiedAt = NOW(), o.notes = CONCAT_WS('\n', o.notes, ?) WHERE i.code LIKE 'HIST-%'",
    [verifierId, verificationNote],
  );
  await connection.query(
    "UPDATE indicators SET officialSource = ?, calculationMethod = CONCAT_WS('\n', calculationMethod, ?) WHERE code LIKE 'HIST-%'",
    [`مركز المعلومات والتوثيق السياحي — ${verificationUrl}`, verificationNote],
  );
  const [summary] = await connection.query("SELECT verificationStatus, COUNT(*) AS count FROM indicatorObservations o INNER JOIN indicators i ON i.id = o.indicatorId WHERE i.code LIKE 'HIST-%' GROUP BY verificationStatus");
  console.log(JSON.stringify({ updated: result.affectedRows, verifierId, summary }, null, 2));
} finally {
  await connection.end();
}
