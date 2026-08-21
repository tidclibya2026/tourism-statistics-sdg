import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  createImportIssues: vi.fn(),
  createImportJob: vi.fn(),
  getIndicatorsByCodes: vi.fn(),
  upsertObservation: vi.fn(),
}));

vi.mock("./db", () => dbMock);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function analystContext(): TrpcContext {
  const now = new Date();
  return { user: { id: 2, openId: "analyst-test", name: "Analyst", email: null, loginMethod: "manus", role: "analyst", createdAt: now, updatedAt: now, lastSignedIn: now }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] };
}

describe("imports.process", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records validation issues and imports only rows that pass validation", async () => {
    dbMock.getIndicatorsByCodes.mockResolvedValue([{ id: 9, code: "ARR-001" }]);
    dbMock.createImportJob.mockResolvedValue(77);
    const caller = appRouter.createCaller(analystContext());
    const result = await caller.imports.process({
      fileName: "measurements.csv",
      fileType: "CSV",
      rows: [
        { code: "ARR-001", year: 2025, period: "annual", value: 100 },
        { code: "UNKNOWN", year: 2025, period: "annual", value: 10 },
      ],
    });

    expect(result).toMatchObject({ jobId: 77, acceptedRows: 1, rejectedRows: 1 });
    expect(dbMock.createImportIssues).toHaveBeenCalledWith(77, expect.arrayContaining([expect.objectContaining({ field: "code" })]));
    expect(dbMock.upsertObservation).toHaveBeenCalledWith(expect.objectContaining({ indicatorId: 9, year: 2025, quarter: "annual" }));
  });
});

