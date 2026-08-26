import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  countSupportRequestAttachments: vi.fn(),
  createSupportRequestAttachment: vi.fn(),
  createSupportRequestReply: vi.fn(),
  createSupportRequest: vi.fn(),
  createSupportNotification: vi.fn(),
  getSupportRequestOwner: vi.fn(),
  listSupportNotifications: vi.fn(),
  markSupportNotificationsRead: vi.fn(),
}));
const storageMock = vi.hoisted(() => ({ storagePut: vi.fn() }));
const notificationMock = vi.hoisted(() => ({ notifyOwner: vi.fn() }));

vi.mock("./db", () => dbMock);
vi.mock("./storage", () => storageMock);
vi.mock("./helpChatbot", () => ({ answerHelpQuestion: vi.fn() }));
vi.mock("./_core/notification", () => notificationMock);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(role: "admin" | "analyst" | "viewer", id = 21): TrpcContext {
  const now = new Date();
  return { user: { id, openId: `${role}-${id}`, name: role, email: null, loginMethod: "manus", role, createdAt: now, updatedAt: now, lastSignedIn: now }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("support replies and attachments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("يقصر رد الإدارة على دور admin", async () => {
    const analyst = appRouter.createCaller(context("analyst", 7));
    await expect(analyst.support.reply({ supportRequestId: 2, message: "سنراجع المشكلة." })).rejects.toMatchObject({ code: "FORBIDDEN" });

    dbMock.createSupportRequestReply.mockResolvedValue({ id: 4 });
    const admin = appRouter.createCaller(context("admin", 5));
    await admin.support.reply({ supportRequestId: 2, message: "سنراجع المشكلة." });
    expect(dbMock.createSupportRequestReply).toHaveBeenCalledWith({ supportRequestId: 2, message: "سنراجع المشكلة.", authorUserId: 5 });
  });

  it("يمنع رفع المرفق إلى طلب لا يملكه المستخدم", async () => {
    dbMock.getSupportRequestOwner.mockResolvedValue({ id: 3, userId: 99 });
    const caller = appRouter.createCaller(context("viewer", 7));
    await expect(caller.support.uploadAttachment({ supportRequestId: 3, fileName: "screen.png", mimeType: "image/png", base64: "aGVsbG8=" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(storageMock.storagePut).not.toHaveBeenCalled();
  });

  it("يرفع مرفقاً صغيراً من النوع المسموح بعد التحقق من الملكية", async () => {
    dbMock.getSupportRequestOwner.mockResolvedValue({ id: 3, userId: 7 });
    dbMock.countSupportRequestAttachments.mockResolvedValue(0);
    storageMock.storagePut.mockResolvedValue({ key: "support/3/file.png", url: "/manus-storage/support/3/file.png" });
    dbMock.createSupportRequestAttachment.mockResolvedValue({ id: 8, url: "/manus-storage/support/3/file.png" });
    const caller = appRouter.createCaller(context("viewer", 7));
    await caller.support.uploadAttachment({ supportRequestId: 3, fileName: "screen.png", mimeType: "image/png", base64: "aGVsbG8=" });
    expect(storageMock.storagePut).toHaveBeenCalledWith(expect.stringContaining("support/3/7-"), expect.any(Buffer), "image/png");
    expect(dbMock.createSupportRequestAttachment).toHaveBeenCalledWith(expect.objectContaining({ supportRequestId: 3, uploadedBy: 7, byteSize: 5 }));
  });

  it("يصعّد المحادثة إلى طلب بشري موثق وينبه المالك دون كشف التفاصيل", async () => {
    dbMock.createSupportRequest.mockResolvedValue({ id: 14 });
    dbMock.createSupportNotification.mockResolvedValue({ id: 5 });
    notificationMock.notifyOwner.mockResolvedValue(true);
    const caller = appRouter.createCaller(context("viewer", 7));
    await caller.support.escalateToHuman({ message: "لم أجد طريقة استكمال مراجعة القياس بعد اتباع الدليل." });
    expect(dbMock.createSupportRequest).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, category: "question", subject: "تصعيد من المساعد الذكي إلى الدعم البشري" }));
    expect(dbMock.createSupportNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, supportRequestId: 14, type: "escalation" }));
    expect(notificationMock.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({ content: expect.stringContaining("14") }));
  });

  it("يعرض الإشعارات للحساب الحالي ويقيد تعليمها كمقروءة به", async () => {
    dbMock.listSupportNotifications.mockResolvedValue([{ id: 8, title: "رد جديد" }]);
    dbMock.markSupportNotificationsRead.mockResolvedValue({ success: true });
    const caller = appRouter.createCaller(context("analyst", 12));
    await expect(caller.support.notifications()).resolves.toEqual([{ id: 8, title: "رد جديد" }]);
    await caller.support.markNotificationsRead({ ids: [8] });
    expect(dbMock.markSupportNotificationsRead).toHaveBeenCalledWith(12, [8]);
  });
});
