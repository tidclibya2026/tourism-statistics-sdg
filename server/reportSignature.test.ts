import { describe, expect, it, beforeEach } from "vitest";
import { assertPkiReady, createReportSignature, getPkiIntegrationStatus, verifyReportSignature } from "./reportSignature";
import { ENV } from "./_core/env";

describe("report digital signature", () => {
  beforeEach(() => { ENV.cookieSecret = "test-signing-secret"; });

  it("creates a verifiable signature for an approved report payload", () => {
    const signed = createReportSignature({ reportType: "approved-observations", title: "تقرير القياسات", yearFrom: 2024, yearTo: 2025, observationCount: 12 }, { name: "رئيس الإحصاء", openId: "chief-1" }, "2026-08-27T10:00:00.000Z");
    expect(signed.algorithm).toBe("HMAC-SHA256");
    expect(verifyReportSignature(signed)).toBe(true);
  });

  it("reports PKI as disabled by default and blocks external signing", () => {
    const previousEnabled = process.env.PKI_INTEGRATION_ENABLED;
    const previousCertificate = process.env.PKI_CERTIFICATE_PEM;
    const previousKey = process.env.PKI_PRIVATE_KEY_PEM;
    delete process.env.PKI_INTEGRATION_ENABLED;
    delete process.env.PKI_CERTIFICATE_PEM;
    delete process.env.PKI_PRIVATE_KEY_PEM;
    expect(getPkiIntegrationStatus()).toMatchObject({ enabled: false, configured: false });
    expect(() => assertPkiReady()).toThrow("تكامل PKI غير مفعّل");
    if (previousEnabled === undefined) delete process.env.PKI_INTEGRATION_ENABLED; else process.env.PKI_INTEGRATION_ENABLED = previousEnabled;
    if (previousCertificate === undefined) delete process.env.PKI_CERTIFICATE_PEM; else process.env.PKI_CERTIFICATE_PEM = previousCertificate;
    if (previousKey === undefined) delete process.env.PKI_PRIVATE_KEY_PEM; else process.env.PKI_PRIVATE_KEY_PEM = previousKey;
  });

  it("rejects a signature after report metadata is changed", () => {
    const signed = createReportSignature({ reportType: "approved-statistics", title: "تقرير رسمي", yearFrom: 2025, yearTo: 2025, observationCount: 4 }, { name: "رئيس الإحصاء", openId: "chief-1" }, "2026-08-27T10:00:00.000Z");
    expect(verifyReportSignature({ ...signed, observationCount: 5 })).toBe(false);
  });
});
