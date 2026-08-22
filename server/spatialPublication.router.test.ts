import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  getPublicationFeed: vi.fn(),
  getPublicationHubData: vi.fn(),
  getSpatialOverview: vi.fn(),
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
});
