import { createHmac, timingSafeEqual } from "node:crypto";
import { ENV } from "./_core/env";

export type ReportSignatureInput = {
  reportType: "approved-observations" | "approved-statistics";
  title: string;
  yearFrom: number;
  yearTo: number;
  observationCount: number;
  contentHash?: string;
};

export type ReportSignature = ReportSignatureInput & {
  signerName: string;
  signerOpenId: string;
  signedAt: string;
  signature: string;
  algorithm: "HMAC-SHA256";
  verificationLabel: string;
};

function canonicalize(input: ReportSignatureInput, signerOpenId: string, signedAt: string) {
  return [input.reportType, input.title, input.yearFrom, input.yearTo, input.observationCount, input.contentHash ?? "", signerOpenId, signedAt].join("|");
}

export function createReportSignature(input: ReportSignatureInput, signer: { name: string; openId: string }, signedAt = new Date().toISOString()): ReportSignature {
  if (!ENV.cookieSecret) throw new Error("لا يمكن إنشاء توقيع رقمي دون سر خادم مضبوط.");
  const signature = createHmac("sha256", ENV.cookieSecret).update(canonicalize(input, signer.openId, signedAt), "utf8").digest("hex");
  return { ...input, signerName: signer.name, signerOpenId: signer.openId, signedAt, signature, algorithm: "HMAC-SHA256", verificationLabel: "توقيع رقمي داخلي قابل للتحقق من خادم المنصة" };
}

export function verifyReportSignature(report: ReportSignature) {
  if (!ENV.cookieSecret) return false;
  const expected = createHmac("sha256", ENV.cookieSecret).update(canonicalize(report, report.signerOpenId, report.signedAt), "utf8").digest("hex");
  const provided = Buffer.from(report.signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return provided.length === expectedBuffer.length && timingSafeEqual(provided, expectedBuffer);
}
