import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({ claimDependencyReviewScheduleRun: vi.fn(), getDependencyReviewScheduleByTaskUid: vi.fn() }));
const sdkMock = vi.hoisted(() => ({ authenticateRequest: vi.fn() }));
const reviewMock = vi.hoisted(() => ({ getDeploymentEnvironment: vi.fn(), runDependencyReview: vi.fn() }));
vi.mock("./db", () => dbMock);
vi.mock("./_core/sdk", () => ({ sdk: sdkMock }));
vi.mock("./dependencyReview", () => reviewMock);

import { dependencyReviewScheduleHandler } from "./dependencyReviewSchedule";

function response() {
  const state = { statusCode: 200, body: undefined as unknown };
  const res: { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockImplementation((code: number) => { state.statusCode = code; return res; });
  res.json.mockImplementation((body: unknown) => { state.body = body; return res; });
  return {
    state,
    res: res as any,
  };
}

describe("dependency review schedule handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reviewMock.getDeploymentEnvironment.mockReturnValue("staging");
  });

  it("rejects any caller that is not an authenticated cron task", async () => {
    sdkMock.authenticateRequest.mockResolvedValue({ isCron: false });
    const { res, state } = response();
    await dependencyReviewScheduleHandler({ originalUrl: "/api/scheduled/dependency-review" } as any, res);
    expect(state).toMatchObject({ statusCode: 403, body: { error: "cron-only" } });
  });

  it("looks up only the trusted task UID and skips retries in the duplicate window", async () => {
    sdkMock.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "task-1" });
    dbMock.getDependencyReviewScheduleByTaskUid.mockResolvedValue({ environment: "staging", enabled: 1 });
    dbMock.claimDependencyReviewScheduleRun.mockResolvedValue(false);
    const { res, state } = response();
    await dependencyReviewScheduleHandler({ originalUrl: "/api/scheduled/dependency-review", body: { taskUid: "attacker" } } as any, res);
    expect(dbMock.getDependencyReviewScheduleByTaskUid).toHaveBeenCalledWith("task-1");
    expect(reviewMock.runDependencyReview).not.toHaveBeenCalled();
    expect(state).toMatchObject({ statusCode: 200, body: { ok: true, skipped: "duplicate-window" } });
  });

  it("runs only an enabled staging schedule", async () => {
    sdkMock.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "task-2" });
    dbMock.getDependencyReviewScheduleByTaskUid.mockResolvedValue({ environment: "staging", enabled: 1 });
    dbMock.claimDependencyReviewScheduleRun.mockResolvedValue(true);
    reviewMock.runDependencyReview.mockResolvedValue({ id: 3, status: "completed" });
    const { res, state } = response();
    await dependencyReviewScheduleHandler({ originalUrl: "/api/scheduled/dependency-review" } as any, res);
    expect(reviewMock.runDependencyReview).toHaveBeenCalledWith({ trigger: "scheduled" });
    expect(state).toMatchObject({ statusCode: 200, body: { ok: true, run: { id: 3, status: "completed" } } });
  });
});
