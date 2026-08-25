import { describe, expect, it } from "vitest";
import { isSessionBoundToCurrentApp } from "./_core/sdk";
import { consumeRequestQuota, productionSecurityHeaders } from "./_core/security";
import { ENV } from "./_core/env";

describe("security hardening", () => {
  it("يرفض جلسة موقعة لتطبيق مختلف", () => {
    expect(isSessionBoundToCurrentApp(ENV.appId)).toBe(true);
    expect(isSessionBoundToCurrentApp(`${ENV.appId}-other`)).toBe(false);
  });

  it("يفرض حداً زمنياً للطلبات ويعيد السماح بعد انتهاء النافذة", () => {
    const buckets = new Map();
    expect(consumeRequestQuota(buckets, "127.0.0.1", 1_000, 2, 60_000).allowed).toBe(true);
    expect(consumeRequestQuota(buckets, "127.0.0.1", 1_010, 2, 60_000).remaining).toBe(0);
    expect(consumeRequestQuota(buckets, "127.0.0.1", 1_020, 2, 60_000).allowed).toBe(false);
    expect(consumeRequestQuota(buckets, "127.0.0.1", 61_001, 2, 60_000).allowed).toBe(true);
  });

  it("يحدد رؤوس منع تضمين المحتوى والميزات الحساسة", () => {
    expect(productionSecurityHeaders["X-Content-Type-Options"]).toBe("nosniff");
    expect(productionSecurityHeaders["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(productionSecurityHeaders["Permissions-Policy"]).toContain("camera=()");
  });
});
