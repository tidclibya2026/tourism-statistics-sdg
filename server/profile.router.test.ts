import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({ getUserPreferences: vi.fn(), updateUserPreferences: vi.fn(), updateUserDisplayName: vi.fn() }));
vi.mock("./db", () => dbMock);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(id = 31): TrpcContext {
  const now = new Date();
  return { user: { id, openId: `profile-${id}`, name: "مستخدم", email: "user@example.ly", loginMethod: "manus", role: "viewer", createdAt: now, updatedAt: now, lastSignedIn: now }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("profile preferences router", () => {
  beforeEach(() => vi.clearAllMocks());
  it("يعرض ويحفظ تفضيلات الإشعارات للحساب الحالي فقط", async () => {
    dbMock.getUserPreferences.mockResolvedValue({ notifySupportReplies: true, notifySupportStatus: false });
    dbMock.updateUserPreferences.mockResolvedValue({ notifySupportReplies: false, notifySupportStatus: true });
    const caller = appRouter.createCaller(context(31));
    await expect(caller.profile.preferences()).resolves.toEqual({ notifySupportReplies: true, notifySupportStatus: false });
    await caller.profile.updatePreferences({ notifySupportReplies: false, notifySupportStatus: true });
    expect(dbMock.updateUserPreferences).toHaveBeenCalledWith(31, { notifySupportReplies: false, notifySupportStatus: true });
  });

  it("يحدث الاسم الظاهر للحساب الحالي فقط ويتحقق من الحد الأدنى", async () => {
    dbMock.updateUserDisplayName.mockResolvedValue({ success: true, name: "مركز المعلومات" });
    const caller = appRouter.createCaller(context(44));
    await caller.profile.updateDisplayName({ name: "مركز المعلومات" });
    expect(dbMock.updateUserDisplayName).toHaveBeenCalledWith(44, "مركز المعلومات");
    await expect(caller.profile.updateDisplayName({ name: "أ" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
