import { describe, expect, it, beforeEach } from "vitest";
import { createReportSignature, verifyReportSignature } from "./reportSignature";
import { ENV } from "./_core/env";

describe("report digital signature", () => {
  beforeEach(() => { ENV.cookieSecret = "test-signing-secret"; });

  it("creates a verifiable signature for an approved report payload", () => {
    const signed = createReportSignature({ reportType: "approved-observations", title: "تقرير القياسات", yearFrom: 2024, yearTo: 2025, observationCount: 12 }, { name: "رئيس الإحصاء", openId: "chief-1" }, "2026-08-27T10:00:00.000Z");
    expect(signed.algorithm).toBe("HMAC-SHA256");
    expect(verifyReportSignature(signed)).toBe(true);
  });

  it("rejects a signature after report metadata is changed", () => {
    const signed = createReportSignature({ reportType: "approved-statistics", title: "تقرير رسمي", yearFrom: 2025, yearTo: 2025, observationCount: 4 }, { name: "رئيس الإحصاء", openId: "chief-1" }, "2026-08-27T10:00:00.000Z");
    expect(verifyReportSignature({ ...signed, observationCount: 5 })).toBe(false);
  });
});
