import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  createSupportRequest: vi.fn(),
  getHelpContentRatingSummary: vi.fn(),
  getMyHelpContentRatings: vi.fn(),
  listMySupportRequests: vi.fn(),
  listSupportRequests: vi.fn(),
  updateSupportRequestStatus: vi.fn(),
  upsertHelpContentRating: vi.fn(),
}));

vi.mock("./db", () => dbMock);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(role: "admin" | "analyst" | "viewer", id = 14): TrpcContext {
  const now = new Date();
  return { user: { id, openId: `support-${role}`, name: role, email: null, loginMethod: "manus", role, createdAt: now, updatedAt: now, lastSignedIn: now }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("support router", () => {
  beforeEach(() => vi.clearAllMocks());

  it("يسجل رسالة الدعم باسم الدور والمستخدم الحاليين فقط", async () => {
    dbMock.createSupportRequest.mockResolvedValue({ id: 5, status: "open" });
    const caller = appRouter.createCaller(context("analyst", 24));
    await caller.support.submit({ category: "issue", subject: "مشكلة في ملف المدن", message: "ظهر خطأ عند معاينة صفوف ملف المدن." });
    expect(dbMock.createSupportRequest).toHaveBeenCalledWith(expect.objectContaining({ userId: 24, roleSnapshot: "analyst", category: "issue" }));
  });

  it("يحفظ تصويتاً واحداً للقسم باسم المستخدم الحالي", async () => {
    dbMock.upsertHelpContentRating.mockResolvedValue({ success: true });
    const caller = appRouter.createCaller(context("viewer", 9));
    await caller.support.rate({ sectionId: "start", rating: "helpful" });
    expect(dbMock.upsertHelpContentRating).toHaveBeenCalledWith({ userId: 9, sectionId: "start", rating: "helpful" });
  });

  it("يقصر صندوق الرسائل وتحديث الحالة على مسؤول admin", async () => {
    const analyst = appRouter.createCaller(context("analyst"));
    await expect(analyst.support.inbox()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(analyst.support.updateStatus({ id: 1, status: "resolved" })).rejects.toMatchObject({ code: "FORBIDDEN" });

    dbMock.listSupportRequests.mockResolvedValue([]);
    dbMock.getHelpContentRatingSummary.mockResolvedValue([]);
    dbMock.updateSupportRequestStatus.mockResolvedValue({ success: true });
    const admin = appRouter.createCaller(context("admin"));
    await expect(admin.support.inbox()).resolves.toEqual({ requests: [], ratingSummary: [] });
    await admin.support.updateStatus({ id: 1, status: "resolved" });
    expect(dbMock.updateSupportRequestStatus).toHaveBeenCalledWith(1, "resolved");
  });
});
