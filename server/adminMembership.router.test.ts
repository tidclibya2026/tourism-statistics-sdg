import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.OWNER_OPEN_ID = "owner-access-test";
});

const dbMock = vi.hoisted(() => ({
  getAdministrativeAccessOverview: vi.fn(),
  getAdministrativeMemberByUserId: vi.fn(),
  hasAdministrativeCapability: vi.fn(),
  listDependencyReviewRuns: vi.fn(),
  listUsers: vi.fn(),
  updateUserRole: vi.fn(),
  upsertAdministrativeMember: vi.fn(),
}));

vi.mock("./db", () => dbMock);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(openId: string, id = 7): TrpcContext {
  const now = new Date();
  return { user: { id, openId, name: openId, email: null, loginMethod: "manus", role: "admin", createdAt: now, updatedAt: now, lastSignedIn: now }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("administrative membership router", () => {
  beforeEach(() => vi.clearAllMocks());

  it("يمنع مسؤولاً غير مفوض من فتح إدارة الأدوار", async () => {
    dbMock.hasAdministrativeCapability.mockResolvedValue(false);
    const caller = appRouter.createCaller(context("ordinary-admin"));
    await expect(caller.users.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.listUsers).not.toHaveBeenCalled();
  });

  it("يسمح لعضو مفوض بإدارة الأدوار ويسجل منفذ التغيير", async () => {
    dbMock.hasAdministrativeCapability.mockResolvedValue(true);
    dbMock.listUsers.mockResolvedValue([{ id: 12, role: "viewer" }]);
    dbMock.getAdministrativeMemberByUserId.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(context("delegated-admin", 7));
    await expect(caller.users.list()).resolves.toHaveLength(1);
    await caller.users.updateRole({ id: 12, role: "analyst" });
    expect(dbMock.updateUserRole).toHaveBeenCalledWith(12, "analyst", 7);
  });

  it("يقصر سجل مراجعة الأمان على المسؤول المفوض بهذه القدرة", async () => {
    dbMock.hasAdministrativeCapability.mockResolvedValue(false);
    const ordinaryAdmin = appRouter.createCaller(context("ordinary-admin"));
    await expect(ordinaryAdmin.security.dependencyReviews()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.listDependencyReviewRuns).not.toHaveBeenCalled();

    dbMock.hasAdministrativeCapability.mockResolvedValue(true);
    dbMock.listDependencyReviewRuns.mockResolvedValue([{ id: 1, status: "completed" }]);
    const securityReviewer = appRouter.createCaller(context("security-reviewer"));
    await expect(securityReviewer.security.dependencyReviews()).resolves.toEqual([{ id: 1, status: "completed" }]);
    expect(dbMock.hasAdministrativeCapability).toHaveBeenLastCalledWith(7, "canReviewSecurity");
  });

  it("يقصر منح العضوية الإدارية على مالك المنصة وحساب admin مستهدف", async () => {
    dbMock.listUsers.mockResolvedValue([{ id: 12, role: "admin" }]);
    dbMock.upsertAdministrativeMember.mockResolvedValue(undefined);
    const owner = appRouter.createCaller(context("owner-access-test", 1));
    await owner.users.setAdministrativeMember({ userId: 12, status: "active", canManageRoles: true, canApproveReleases: false, canReviewSecurity: true });
    expect(dbMock.upsertAdministrativeMember).toHaveBeenCalledWith(expect.objectContaining({ userId: 12, canManageRoles: true }), 1);

    dbMock.hasAdministrativeCapability.mockResolvedValue(true);
    const delegated = appRouter.createCaller(context("delegated-admin", 7));
    await expect(delegated.users.setAdministrativeMember({ userId: 12, status: "active", canManageRoles: true, canApproveReleases: false, canReviewSecurity: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
