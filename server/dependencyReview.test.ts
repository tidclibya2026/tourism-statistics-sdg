import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({ recordDependencyReviewRun: vi.fn() }));
vi.mock("./db", () => dbMock);

import { runDependencyReview, summarizeNpmBulkAdvisories } from "./dependencyReview";

describe("dependency review service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("TOURISM_DEPLOYMENT_ENV", "staging");
  });

  it("deduplicates registry advisories and counts each severity", () => {
    expect(summarizeNpmBulkAdvisories({
      alpha: [{ id: 1, title: "أول", severity: "critical" }, { id: 2, title: "ثان", severity: "high" }],
      beta: [{ id: 1, title: "أول", severity: "critical" }, { id: 3, title: "ثالث", severity: "moderate" }, { id: 4, title: "رابع", severity: "low" }],
    })).toEqual({ advisoryCount: 5, criticalCount: 2, highCount: 1, moderateCount: 1, lowCount: 1 });
  });

  it("records a report-only successful review without mutating dependencies", async () => {
    dbMock.recordDependencyReviewRun.mockResolvedValue(17);
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ alpha: [{ id: 99, title: "تنبيه", severity: "high" }] }), { status: 200, headers: { "content-type": "application/json" } }));
    const result = await runDependencyReview({ trigger: "manual", initiatedBy: 7, fetchImpl, inventoryLoader: async () => ({ alpha: ["1.2.3"] }) });

    expect(result).toMatchObject({ id: 17, status: "completed", highCount: 1, advisoryCount: 1 });
    expect(fetchImpl).toHaveBeenCalledWith("https://registry.npmjs.org/-/npm/v1/security/advisories/bulk", expect.objectContaining({ method: "POST", body: JSON.stringify({ alpha: ["1.2.3"] }) }));
    expect(dbMock.recordDependencyReviewRun).toHaveBeenCalledWith(expect.objectContaining({ status: "completed", trigger: "manual", initiatedBy: 7, summary: expect.stringContaining("لا تغير الحزم") }));
  });

  it("records a failed review while leaving dependency changes outside the workflow", async () => {
    dbMock.recordDependencyReviewRun.mockResolvedValue(18);
    await expect(runDependencyReview({ trigger: "scheduled", fetchImpl: vi.fn().mockRejectedValue(new Error("network")), inventoryLoader: async () => ({ alpha: ["1.2.3"] }) })).rejects.toThrow("network");
    expect(dbMock.recordDependencyReviewRun).toHaveBeenCalledWith(expect.objectContaining({ status: "failed", trigger: "scheduled", criticalCount: 0, summary: expect.stringContaining("لم يحدث أي تغيير") }));
  });

  it("rejects manual execution outside the staging environment before a registry call", async () => {
    vi.stubEnv("TOURISM_DEPLOYMENT_ENV", "production");
    const fetchImpl = vi.fn();
    await expect(runDependencyReview({ trigger: "manual", fetchImpl, inventoryLoader: async () => ({ alpha: ["1.2.3"] }) })).rejects.toThrow("بيئة الاختبار فقط");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
