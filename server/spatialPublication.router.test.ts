import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  createSpatialArea: vi.fn(),
  getIndicatorById: vi.fn(),
  getPublicationFeed: vi.fn(),
  getPublicationHubData: vi.fn(),
  getSpatialAreaById: vi.fn(),
  getSpatialAreaDetail: vi.fn(),
  getCityRankings: vi.fn(),
  getCityTrend: vi.fn(),
  getSpatialManagementData: vi.fn(),
  getSpatialObservationById: vi.fn(),
  getSpatialOverview: vi.fn(),
  moveSpatialObservationStatus: vi.fn(),
  upsertSpatialObservation: vi.fn(),
  updatePublicationDestinationStatus: vi.fn(),
}));

vi.mock("./db", () => dbMock);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function context(role: "admin" | "analyst" | "viewer"): TrpcContext {
  const now = new Date();
  return {
    user: { id: 7, openId: `spatial-${role}`, name: role, email: null, loginMethod: "manus", role, createdAt: now, updatedAt: now, lastSignedIn: now },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("spatial and publication routers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("forwards spatial filters and lets a viewer read approved spatial content", async () => {
    dbMock.getSpatialOverview.mockResolvedValue({ summary: { approvedObservations: 0 } });
    const caller = appRouter.createCaller(context("viewer"));

    await expect(caller.spatial.overview({ year: 2025, indicatorId: 3, areaId: 5 })).resolves.toEqual({ summary: { approvedObservations: 0 } });
    expect(dbMock.getSpatialOverview).toHaveBeenCalledWith({ year: 2025, indicatorId: 3, areaId: 5 });
  });

  it("returns a spatial location detail only when the location is active", async () => {
    dbMock.getSpatialAreaDetail.mockResolvedValue({ area: { id: 1, name: "طرابلس التاريخية" }, observations: [], summary: { approvedObservations: 0 } });
    const caller = appRouter.createCaller(context("viewer"));

    await expect(caller.spatial.detail({ areaId: 1 })).resolves.toMatchObject({ area: { name: "طرابلس التاريخية" } });
    expect(dbMock.getSpatialAreaDetail).toHaveBeenCalledWith(1);
  });

  it("hides non-city detail records from the public spatial detail flow", async () => {
    dbMock.getSpatialAreaDetail.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(context("viewer"));

    await expect(caller.spatial.detail({ areaId: 99 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns city ranking boards to authenticated viewers", async () => {
    dbMock.getCityRankings.mockResolvedValue([{ id: "tourists", label: "السياح", items: [] }]);
    const caller = appRouter.createCaller(context("viewer"));

    await expect(caller.spatial.cityRankings()).resolves.toEqual([{ id: "tourists", label: "السياح", items: [] }]);
    expect(dbMock.getCityRankings).toHaveBeenCalledOnce();
  });

  it("returns a category-specific temporal city trend to authenticated viewers", async () => {
    dbMock.getCityTrend.mockResolvedValue({ category: { id: "tourists" }, years: [], series: [] });
    const caller = appRouter.createCaller(context("viewer"));

    await expect(caller.spatial.cityTrend({ categoryId: "tourists" })).resolves.toEqual({ category: { id: "tourists" }, years: [], series: [] });
    expect(dbMock.getCityTrend).toHaveBeenCalledWith("tourists");
  });

  it("returns the unified publication hub to authenticated users", async () => {
    dbMock.getPublicationHubData.mockResolvedValue({ summary: { nationalApproved: 179 } });
    const caller = appRouter.createCaller(context("analyst"));

    await expect(caller.publication.hub()).resolves.toEqual({ summary: { nationalApproved: 179 } });
    expect(dbMock.getPublicationHubData).toHaveBeenCalledOnce();
  });

  it("exposes a stable public feed that remains empty until its destination is ready", async () => {
    dbMock.getPublicationFeed.mockResolvedValue({ ready: false, records: [], message: "لم تُجهز هذه الوجهة بعد للربط الخارجي." });
    const publicCaller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] });

    await expect(publicCaller.publication.feed({ destination: "visit_libya" })).resolves.toMatchObject({ ready: false, records: [] });
    expect(dbMock.getPublicationFeed).toHaveBeenCalledWith("visit_libya");
  });

  it("restricts destination readiness changes to administrators", async () => {
    dbMock.updatePublicationDestinationStatus.mockResolvedValue(undefined);
    const admin = appRouter.createCaller(context("admin"));
    const viewer = appRouter.createCaller(context("viewer"));

    await admin.publication.updateStatus({ id: 1, status: "ready" });
    expect(dbMock.updatePublicationDestinationStatus).toHaveBeenCalledWith(1, "ready", 7);
    await expect(viewer.publication.updateStatus({ id: 1, status: "ready" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("stores spatial measurements as drafts after validating an active location and the indicator unit", async () => {
    dbMock.getSpatialAreaById.mockResolvedValue({ id: 8, status: "active", type: "city" });
    dbMock.getIndicatorById.mockResolvedValue({ id: 3, unit: "عدد" });
    dbMock.upsertSpatialObservation.mockResolvedValue(undefined);
    const analyst = appRouter.createCaller(context("analyst"));

    await analyst.spatial.upsertObservation({ spatialAreaId: 8, indicatorId: 3, year: 2025, period: "annual", quarter: "annual", value: 240, targetValue: null, source: "تقرير رسمي", notes: "الصفحة 12" });

    expect(dbMock.upsertSpatialObservation).toHaveBeenCalledWith(expect.objectContaining({ spatialAreaId: 8, indicatorId: 3, value: "240", verificationStatus: "draft", enteredBy: 7 }));
  });

  it("allows only an administrator to register a verified boundary reference", async () => {
    dbMock.createSpatialArea.mockResolvedValue(17);
    const admin = appRouter.createCaller(context("admin"));
    const analyst = appRouter.createCaller(context("analyst"));
    const payload = { code: "CITY-EX", name: "مدينة تجريبية", type: "city" as const, parentId: null, geographicSource: "مرجع تسمية", boundaryReferenceTitle: "مرجع حدود رسمي", boundaryReferenceUrl: "https://example.gov.ly/boundaries", boundaryStatus: "verified" as const, status: "active" as const };

    await expect(admin.spatial.createArea(payload)).resolves.toBe(17);
    expect(dbMock.createSpatialArea).toHaveBeenCalledWith(expect.objectContaining({ boundaryStatus: "verified", boundaryVerifiedBy: 7, boundaryVerifiedAt: expect.any(Date) }));
    await expect(analyst.spatial.createArea(payload)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requires an independent reviewer before an administrator can approve a spatial observation", async () => {
    dbMock.getSpatialObservationById.mockResolvedValue({ id: 31, verificationStatus: "draft", enteredBy: 8 });
    dbMock.moveSpatialObservationStatus.mockResolvedValue(undefined);
    const analyst = appRouter.createCaller(context("analyst"));
    const admin = appRouter.createCaller(context("admin"));

    await analyst.spatial.setObservationStatus({ id: 31, status: "reviewed", note: "تمت مطابقة المصدر." });
    expect(dbMock.moveSpatialObservationStatus).toHaveBeenCalledWith(31, "reviewed", 7, "تمت مطابقة المصدر.");

    dbMock.getSpatialObservationById.mockResolvedValue({ id: 31, verificationStatus: "reviewed", enteredBy: 8 });
    await admin.spatial.setObservationStatus({ id: 31, status: "approved" });
    expect(dbMock.moveSpatialObservationStatus).toHaveBeenCalledWith(31, "approved", 7, undefined);
  });

  it("prevents a contributor from reviewing their own spatial observation or skipping review", async () => {
    dbMock.getSpatialObservationById.mockResolvedValue({ id: 32, verificationStatus: "draft", enteredBy: 7 });
    const analyst = appRouter.createCaller(context("analyst"));
    const admin = appRouter.createCaller(context("admin"));

    await expect(analyst.spatial.setObservationStatus({ id: 32, status: "reviewed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(admin.spatial.setObservationStatus({ id: 32, status: "approved" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
