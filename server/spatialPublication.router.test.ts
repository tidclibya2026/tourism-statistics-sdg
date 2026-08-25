import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  createSpatialArea: vi.fn(),
  getIndicatorById: vi.fn(),
  getPublicationFeed: vi.fn(),
  getPublicationHubData: vi.fn(),
  getPublicationShowcaseData: vi.fn(),
  getSpatialAreaById: vi.fn(),
  getSpatialAreaDetail: vi.fn(),
  getCityRankings: vi.fn(),
  getCityTrend: vi.fn(),
  getSpatialManagementData: vi.fn(),
  getSpatialEntryOptions: vi.fn(),
  getSpatialObservationById: vi.fn(),
  getSpatialObservationsByIds: vi.fn(),
  getSpatialObservationForPeriod: vi.fn(),
  getSpatialOverview: vi.fn(),
  hasAdministrativeCapability: vi.fn(),
  moveSpatialObservationStatus: vi.fn(),
  moveSpatialObservationStatuses: vi.fn(),
  approveOfficialCityAccommodation2013Batch: vi.fn(),
  approveOfficialCityGuides2009to2010Batch: vi.fn(),
  reviewOfficialCityAccommodation2013Batch: vi.fn(),
  reviewOfficialCityGuides2009to2010Batch: vi.fn(),
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
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.hasAdministrativeCapability.mockResolvedValue(true);
  });

  it("forwards spatial filters and lets the public read approved spatial content", async () => {
    dbMock.getSpatialOverview.mockResolvedValue({ summary: { approvedObservations: 0 } });
    const caller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] });

    await expect(caller.spatial.overview({ year: 2025, indicatorId: 3, areaId: 5 })).resolves.toEqual({ summary: { approvedObservations: 0 } });
    expect(dbMock.getSpatialOverview).toHaveBeenCalledWith({ year: 2025, indicatorId: 3, areaId: 5 });
  });

  it("returns an optional viewer session for public city routes without requiring login", async () => {
    const publicCaller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] });
    const authenticatedCaller = appRouter.createCaller(context("analyst"));

    await expect(publicCaller.auth.viewer()).resolves.toBeNull();
    await expect(authenticatedCaller.auth.viewer()).resolves.toMatchObject({ id: 7, role: "analyst" });
  });

  it("returns a spatial location detail to the public only when the location is active", async () => {
    dbMock.getSpatialAreaDetail.mockResolvedValue({ area: { id: 1, name: "طرابلس التاريخية" }, observations: [], summary: { approvedObservations: 0 } });
    const caller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] });

    await expect(caller.spatial.detail({ areaId: 1 })).resolves.toMatchObject({ area: { name: "طرابلس التاريخية" } });
    expect(dbMock.getSpatialAreaDetail).toHaveBeenCalledWith(1);
  });

  it("hides non-city detail records from the public spatial detail flow", async () => {
    dbMock.getSpatialAreaDetail.mockResolvedValue(undefined);
    const caller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] });

    await expect(caller.spatial.detail({ areaId: 99 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns city ranking boards to public visitors", async () => {
    dbMock.getCityRankings.mockResolvedValue([{ id: "tourists", label: "السياح", items: [] }]);
    const caller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] });

    await expect(caller.spatial.cityRankings()).resolves.toEqual([{ id: "tourists", label: "السياح", items: [] }]);
    expect(dbMock.getCityRankings).toHaveBeenCalledOnce();
  });

  it("returns a category-specific temporal city trend to public visitors", async () => {
    dbMock.getCityTrend.mockResolvedValue({ category: { id: "tourists" }, years: [], series: [] });
    const caller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] });

    await expect(caller.spatial.cityTrend({ categoryId: "tourists" })).resolves.toEqual({ category: { id: "tourists" }, years: [], series: [] });
    expect(dbMock.getCityTrend).toHaveBeenCalledWith("tourists");
  });

  it("returns the unified publication hub to authenticated users", async () => {
    dbMock.getPublicationHubData.mockResolvedValue({ summary: { nationalApproved: 179 } });
    const caller = appRouter.createCaller(context("analyst"));

    await expect(caller.publication.hub()).resolves.toEqual({ summary: { nationalApproved: 179 } });
    expect(dbMock.getPublicationHubData).toHaveBeenCalledOnce();
  });

  it("provides a public, read-only showcase without turning publication feeds ready", async () => {
    dbMock.getPublicationShowcaseData.mockResolvedValue({ summary: { spatialApproved: 659 }, destinations: [], analytics: { indicatorSeries: [], coverageByYear: [], gaps: [], exportRecords: [] } });
    const caller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] });

    await expect(caller.publication.showcase()).resolves.toEqual({ summary: { spatialApproved: 659 }, destinations: [], analytics: { indicatorSeries: [], coverageByYear: [], gaps: [], exportRecords: [] } });
    expect(dbMock.getPublicationShowcaseData).toHaveBeenCalledOnce();
  });

  it("limits city-entry options to data-entry roles", async () => {
    dbMock.getSpatialEntryOptions.mockResolvedValue({ cities: [{ id: 1, name: "طرابلس" }], indicators: [] });
    const analyst = appRouter.createCaller(context("analyst"));
    const viewer = appRouter.createCaller(context("viewer"));

    await expect(analyst.spatial.entryOptions()).resolves.toMatchObject({ cities: [{ name: "طرابلس" }] });
    await expect(viewer.spatial.entryOptions()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps spatial management protected when public city reads are enabled", async () => {
    const caller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] });

    await expect(caller.spatial.management()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(dbMock.getSpatialManagementData).not.toHaveBeenCalled();
  });

  it("exposes a stable public feed that remains empty until its destination is ready", async () => {
    dbMock.getPublicationFeed.mockResolvedValue({ ready: false, records: [], message: "لم تُجهز هذه الوجهة بعد للربط الخارجي." });
    const publicCaller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] });

    await expect(publicCaller.publication.feed({ destination: "visit_libya" })).resolves.toMatchObject({ ready: false, records: [] });
    expect(dbMock.getPublicationFeed).toHaveBeenCalledWith("visit_libya");
  });

  it("restricts destination readiness changes to explicitly authorized release approvers", async () => {
    dbMock.updatePublicationDestinationStatus.mockResolvedValue(undefined);
    const admin = appRouter.createCaller(context("admin"));
    const viewer = appRouter.createCaller(context("viewer"));

    await expect(admin.publication.updateStatus({ id: 1, status: "ready" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await admin.publication.updateStatus({ id: 1, status: "ready", confirmed: true });
    expect(dbMock.updatePublicationDestinationStatus).toHaveBeenCalledWith(1, "ready", 7);
    await expect(viewer.publication.updateStatus({ id: 1, status: "ready", confirmed: true })).rejects.toMatchObject({ code: "FORBIDDEN" });

    dbMock.hasAdministrativeCapability.mockResolvedValue(false);
    await expect(admin.publication.updateStatus({ id: 1, status: "ready", confirmed: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("stores spatial measurements as drafts after validating an active location and the indicator unit", async () => {
    dbMock.getSpatialAreaById.mockResolvedValue({ id: 8, status: "active", type: "city" });
    dbMock.getIndicatorById.mockResolvedValue({ id: 3, unit: "عدد" });
    dbMock.getSpatialObservationForPeriod.mockResolvedValue(undefined);
    dbMock.upsertSpatialObservation.mockResolvedValue(undefined);
    const analyst = appRouter.createCaller(context("analyst"));

    await analyst.spatial.upsertObservation({ spatialAreaId: 8, indicatorId: 3, year: 2025, period: "annual", quarter: "annual", value: 240, targetValue: null, source: "تقرير رسمي", notes: "الصفحة 12" });

    expect(dbMock.upsertSpatialObservation).toHaveBeenCalledWith(expect.objectContaining({ spatialAreaId: 8, indicatorId: 3, value: "240", verificationStatus: "draft", enteredBy: 7 }));
  });

  it("prevents a reviewer from editing a spatial draft entered by another user", async () => {
    dbMock.getSpatialAreaById.mockResolvedValue({ id: 8, status: "active", type: "city" });
    dbMock.getIndicatorById.mockResolvedValue({ id: 3, unit: "عدد" });
    dbMock.getSpatialObservationForPeriod.mockResolvedValue({ id: 44, enteredBy: 8, verificationStatus: "draft" });
    const analyst = appRouter.createCaller(context("analyst"));

    await expect(analyst.spatial.upsertObservation({ spatialAreaId: 8, indicatorId: 3, year: 2025, period: "annual", quarter: "annual", value: 240, targetValue: null, source: "تقرير رسمي", notes: "الصفحة 12" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.upsertSpatialObservation).not.toHaveBeenCalled();
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

  it("moves only a homogeneous eligible selection through the governed bulk workflow", async () => {
    const analyst = appRouter.createCaller(context("analyst"));
    const admin = appRouter.createCaller(context("admin"));
    dbMock.getSpatialObservationsByIds.mockResolvedValue([{ id: 41, verificationStatus: "draft", enteredBy: 8 }, { id: 42, verificationStatus: "draft", enteredBy: 9 }]);
    dbMock.moveSpatialObservationStatuses.mockResolvedValue(2);

    await expect(analyst.spatial.bulkSetObservationStatus({ ids: [41, 42], status: "reviewed", confirmed: true, note: "مراجعة دفعة مختارة." })).resolves.toEqual({ updated: 2, status: "reviewed" });
    expect(dbMock.moveSpatialObservationStatuses).toHaveBeenCalledWith([41, 42], "reviewed", 7, "مراجعة دفعة مختارة.");

    dbMock.getSpatialObservationsByIds.mockResolvedValue([{ id: 41, verificationStatus: "reviewed", enteredBy: 8 }, { id: 42, verificationStatus: "reviewed", enteredBy: 9 }]);
    await expect(admin.spatial.bulkSetObservationStatus({ ids: [41, 42], status: "approved", confirmed: true })).resolves.toEqual({ updated: 2, status: "approved" });
    await expect(analyst.spatial.bulkSetObservationStatus({ ids: [41, 42], status: "approved", confirmed: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a bulk selection that mixes statuses or includes a self-entered draft", async () => {
    const analyst = appRouter.createCaller(context("analyst"));
    dbMock.getSpatialObservationsByIds.mockResolvedValue([{ id: 43, verificationStatus: "draft", enteredBy: 7 }, { id: 44, verificationStatus: "draft", enteredBy: 8 }]);
    await expect(analyst.spatial.bulkSetObservationStatus({ ids: [43, 44], status: "reviewed", confirmed: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    dbMock.getSpatialObservationsByIds.mockResolvedValue([{ id: 43, verificationStatus: "draft", enteredBy: 8 }, { id: 44, verificationStatus: "reviewed", enteredBy: 9 }]);
    await expect(analyst.spatial.bulkSetObservationStatus({ ids: [43, 44], status: "reviewed", confirmed: true })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("allows an administrator to withdraw an approved spatial observation with an auditable rejection", async () => {
    dbMock.getSpatialObservationById.mockResolvedValue({ id: 33, verificationStatus: "approved", enteredBy: 8 });
    dbMock.moveSpatialObservationStatus.mockResolvedValue(undefined);
    const admin = appRouter.createCaller(context("admin"));

    await admin.spatial.setObservationStatus({ id: 33, status: "rejected", note: "المصدر غير ضمن المستندات المعتمدة." });
    expect(dbMock.moveSpatialObservationStatus).toHaveBeenCalledWith(33, "rejected", 7, "المصدر غير ضمن المستندات المعتمدة.");
  });

  it("allows only an administrator to reopen a rejected official observation as a documented draft", async () => {
    dbMock.getSpatialObservationById.mockResolvedValue({ id: 34, verificationStatus: "rejected", enteredBy: 8 });
    dbMock.moveSpatialObservationStatus.mockResolvedValue(undefined);
    const admin = appRouter.createCaller(context("admin"));
    const analyst = appRouter.createCaller(context("analyst"));

    await admin.spatial.setObservationStatus({ id: 34, status: "draft", note: "استعادة من المصدر الرسمي." });
    expect(dbMock.moveSpatialObservationStatus).toHaveBeenCalledWith(34, "draft", 7, "استعادة من المصدر الرسمي.");
    await expect(analyst.spatial.setObservationStatus({ id: 34, status: "draft" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lets an analyst confirm the constrained official city-accommodation batch only", async () => {
    dbMock.reviewOfficialCityAccommodation2013Batch.mockResolvedValue({ identified: 123, reviewed: 123, skippedSelfEntered: 0 });
    const analyst = appRouter.createCaller(context("analyst"));
    const viewer = appRouter.createCaller(context("viewer"));

    await expect(analyst.spatial.reviewOfficialCityAccommodation2013Batch({ confirmed: true, note: "تمت مطابقة الجدول والمصدر." })).resolves.toMatchObject({ reviewed: 123 });
    expect(dbMock.reviewOfficialCityAccommodation2013Batch).toHaveBeenCalledWith(7, "تمت مطابقة الجدول والمصدر.");
    await expect(viewer.spatial.reviewOfficialCityAccommodation2013Batch({ confirmed: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("limits official-batch publication approval to an administrator", async () => {
    dbMock.approveOfficialCityAccommodation2013Batch.mockResolvedValue({ identified: 123, approved: 123 });
    const admin = appRouter.createCaller(context("admin"));
    const analyst = appRouter.createCaller(context("analyst"));

    await expect(admin.spatial.approveOfficialCityAccommodation2013Batch({ confirmed: true, note: "اعتماد بعد استكمال المراجعة." })).resolves.toMatchObject({ approved: 123 });
    expect(dbMock.approveOfficialCityAccommodation2013Batch).toHaveBeenCalledWith(7, "اعتماد بعد استكمال المراجعة.");
    await expect(analyst.spatial.approveOfficialCityAccommodation2013Batch({ confirmed: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps the 2009–2010 city-guides batch on the same independent review and admin-approval path", async () => {
    dbMock.reviewOfficialCityGuides2009to2010Batch.mockResolvedValue({ identified: 10, reviewed: 10, skippedSelfEntered: 0 });
    dbMock.approveOfficialCityGuides2009to2010Batch.mockResolvedValue({ identified: 10, approved: 10 });
    const analyst = appRouter.createCaller(context("analyst"));
    const admin = appRouter.createCaller(context("admin"));
    const viewer = appRouter.createCaller(context("viewer"));

    await expect(analyst.spatial.reviewOfficialCityGuides2009to2010Batch({ confirmed: true, note: "تمت مطابقة جدولَي المرشدين." })).resolves.toMatchObject({ reviewed: 10 });
    expect(dbMock.reviewOfficialCityGuides2009to2010Batch).toHaveBeenCalledWith(7, "تمت مطابقة جدولَي المرشدين.");
    await expect(viewer.spatial.reviewOfficialCityGuides2009to2010Batch({ confirmed: true })).rejects.toMatchObject({ code: "FORBIDDEN" });

    await expect(admin.spatial.approveOfficialCityGuides2009to2010Batch({ confirmed: true, note: "اعتماد بعد المراجعة المستقلة." })).resolves.toMatchObject({ approved: 10 });
    expect(dbMock.approveOfficialCityGuides2009to2010Batch).toHaveBeenCalledWith(7, "اعتماد بعد المراجعة المستقلة.");
    await expect(analyst.spatial.approveOfficialCityGuides2009to2010Batch({ confirmed: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
