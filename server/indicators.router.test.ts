import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  createIndicator: vi.fn(),
  changeObservationStatus: vi.fn(),
  getIndicatorById: vi.fn(),
  getObservationById: vi.fn(),
  getObservationForPeriod: vi.fn(),
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
const llmMock = vi.hoisted(() => ({ invokeLLM: vi.fn() }));

vi.mock("./db", () => dbMock);
vi.mock("./_core/llm", () => llmMock);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function adminContext(): TrpcContext {
  const now = new Date();
  return { user: { id: 1, openId: "admin-test", name: "Admin", email: null, loginMethod: "manus", role: "admin", createdAt: now, updatedAt: now, lastSignedIn: now }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] };
}

function analystContext(): TrpcContext {
  const now = new Date();
  return { user: { id: 2, openId: "analyst-test", name: "Analyst", email: null, loginMethod: "manus", role: "analyst", createdAt: now, updatedAt: now, lastSignedIn: now }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] };
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

  it("forwards year and SDG reference filters to the dashboard data layer", async () => {
    dbMock.getDashboardData.mockResolvedValue({ summary: { approvedObservations: 0 } });
    const caller = appRouter.createCaller(adminContext());

    await caller.dashboard.summary({ year: 2025, sdgReference: "SDG 8" });

    expect(dbMock.getDashboardData).toHaveBeenCalledWith({ year: 2025, sdgReference: "SDG 8" });
  });

  it("generates an AI narrative only from the filtered dashboard data", async () => {
    dbMock.getDashboardData.mockResolvedValue({
      summary: { totalIndicators: 2, publishedIndicators: 2, approvedObservations: 4, latestYear: 2025, indicatorsWithTargets: 1, achievedTargets: 1 },
      trendByYear: [{ year: 2025, observations: 4 }],
      targetPerformance: [],
    });
    llmMock.invokeLLM.mockResolvedValue({ choices: [{ message: { content: "## الملخص التنفيذي\n\nبيانات معتمدة." } }] });
    const caller = appRouter.createCaller(adminContext());

    const result = await caller.dashboard.narrative({ year: 2025, sdgReference: "SDG 8" });

    expect(result.text).toContain("الملخص التنفيذي");
    expect(llmMock.invokeLLM).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5-mini" }));
    expect(dbMock.getDashboardData).toHaveBeenCalledWith({ year: 2025, sdgReference: "SDG 8" });
  });

  it("يفرض المراجعة المستقلة واعتماد المسؤول على القياسات الوطنية", async () => {
    dbMock.getObservationById.mockResolvedValue({ id: 21, verificationStatus: "draft", enteredBy: 9 });
    dbMock.changeObservationStatus.mockResolvedValue(undefined);
    const analyst = appRouter.createCaller(analystContext());
    const admin = appRouter.createCaller(adminContext());

    await expect(analyst.observations.setStatus({ id: 21, status: "approved" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await analyst.observations.setStatus({ id: 21, status: "reviewed" });
    expect(dbMock.changeObservationStatus).toHaveBeenCalledWith(21, "reviewed", 2);

    dbMock.getObservationById.mockResolvedValue({ id: 21, verificationStatus: "reviewed", enteredBy: 9 });
    await admin.observations.setStatus({ id: 21, status: "approved" });
    expect(dbMock.changeObservationStatus).toHaveBeenCalledWith(21, "approved", 1);
  });

  it("يرفض استبدال قياس وطني معتمد أو منسوب إلى مستخدم آخر", async () => {
    dbMock.getIndicatorById.mockResolvedValue({ id: 4, unit: "عدد" });
    dbMock.getObservationForPeriod.mockResolvedValue({ id: 25, verificationStatus: "approved", enteredBy: 9 });
    const analyst = appRouter.createCaller(analystContext());
    await expect(analyst.observations.upsert({ indicatorId: 4, year: 2024, period: "annual", quarter: "annual", value: 18 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.upsertObservation).not.toHaveBeenCalled();
  });
});
