import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  createIndicator: vi.fn(),
  deleteIndicator: vi.fn(),
  getDashboardData: vi.fn(),
  getIndicatorsByCodes: vi.fn(),
  listImportJobs: vi.fn(),
  listIndicators: vi.fn(),
  listObservations: vi.fn(),
  listUsers: vi.fn(),
  updateIndicator: vi.fn(),
  updateUserRole: vi.fn(),
  upsertObservation: vi.fn(),
}));

vi.mock("./db", () => dbMock);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function adminContext(): TrpcContext {
  const now = new Date();
  return { user: { id: 1, openId: "admin-test", name: "Admin", email: null, loginMethod: "manus", role: "admin", createdAt: now, updatedAt: now, lastSignedIn: now }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] };
}

describe("indicators router", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends complete create, update and delete operations to the database layer", async () => {
    dbMock.createIndicator.mockResolvedValue(15);
    const caller = appRouter.createCaller(adminContext());
    const payload = { code: "ARR-001", name: "الوافدون", axis: "اقتصادي" as const, framework: "UNWTO" as const, unit: "عدد", status: "draft" as const };

    await expect(caller.indicators.create(payload)).resolves.toBe(15);
    expect(dbMock.createIndicator).toHaveBeenCalledWith(expect.objectContaining({ ...payload, createdBy: 1 }));

    await caller.indicators.update({ id: 15, name: "إجمالي الوافدين" });
    expect(dbMock.updateIndicator).toHaveBeenCalledWith(15, { name: "إجمالي الوافدين" });

    await caller.indicators.delete({ id: 15 });
    expect(dbMock.deleteIndicator).toHaveBeenCalledWith(15);
  });
});

