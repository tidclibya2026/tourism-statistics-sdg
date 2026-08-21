import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function viewerContext(): TrpcContext {
  const now = new Date();
  return {
    user: {
      id: 4,
      openId: "viewer-test",
      name: "Viewer test",
      email: "viewer@example.com",
      loginMethod: "manus",
      role: "viewer",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("role-based access", () => {
  it("blocks viewers from creating indicators", async () => {
    const caller = appRouter.createCaller(viewerContext());
    await expect(caller.indicators.create({
      code: "TEST-001",
      name: "مؤشر اختبار",
      axis: "اقتصادي",
      framework: "UNWTO",
      unit: "عدد",
      status: "draft",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks viewers from entering observations", async () => {
    const caller = appRouter.createCaller(viewerContext());
    await expect(caller.observations.upsert({
      indicatorId: 1,
      year: 2026,
      period: "annual",
      quarter: "annual",
      value: 1,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
