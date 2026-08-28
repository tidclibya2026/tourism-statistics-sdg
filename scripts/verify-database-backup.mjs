import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { open, stat } from "node:fs/promises";
import path from "node:path";

const file = process.argv[2];
const expectedHash = process.argv[3]?.toLowerCase();
if (!file || !expectedHash) {
  throw new Error("الاستخدام: pnpm db:backup:verify <backup.sql.gz> <sha256>");
}
if (!/^[a-f0-9]{64}$/.test(expectedHash)) throw new Error("قيمة SHA-256 غير صالحة");

const info = await stat(file);
if (!info.isFile() || info.size === 0) throw new Error("ملف النسخة الاحتياطية فارغ أو غير صالح");
const handle = await open(file, "r");
const signature = Buffer.alloc(2);
try {
  await handle.read(signature, 0, 2, 0);
} finally {
  await handle.close();
}
if (signature[0] !== 0x1f || signature[1] !== 0x8b) throw new Error("الملف ليس أرشيف gzip صالح النوع");

const hash = createHash("sha256");
for await (const chunk of createReadStream(file)) hash.update(chunk);
const actualHash = hash.digest("hex");
if (actualHash !== expectedHash) throw new Error("فشل تحقق SHA-256؛ لا تستخدم هذه النسخة للاستعادة");

console.log(JSON.stringify({
  ok: true,
  file: path.basename(file),
  sizeBytes: info.size,
  sha256: actualHash,
}, null, 2));
