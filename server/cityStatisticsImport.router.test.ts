import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({
  createImportIssues: vi.fn(),
  createImportJob: vi.fn(),
  getIndicatorsByCodes: vi.fn(),
  getSpatialAreasByCodes: vi.fn(),
  getSpatialObservationForPeriod: vi.fn(),
  upsertSpatialObservation: vi.fn(),
}));

vi.mock("./db", () => dbMock);

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function analystContext(): TrpcContext {
  const now = new Date();
  return { user: { id: 2, openId: "analyst-test", name: "Analyst", email: null, loginMethod: "manus", role: "analyst", createdAt: now, updatedAt: now, lastSignedIn: now }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] };
}

describe("imports.processCityTemplate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a governed draft with source trace and never creates an approved value", async () => {
    dbMock.getSpatialAreasByCodes.mockResolvedValue([{ id: 4, code: "CITY-TRIPOLI", type: "city", status: "active" }]);
    dbMock.getIndicatorsByCodes.mockResolvedValue([{ id: 90001, code: "SPATIAL-TOURISM-SITES-COUNT", unit: "موقع" }]);
    dbMock.getSpatialObservationForPeriod.mockResolvedValue(undefined);
    dbMock.createImportJob.mockResolvedValue(91);
    const result = await appRouter.createCaller(analystContext()).imports.processCityTemplate({
      fileName: "city-request.xlsx",
      rows: [{ "رمز المدينة": "CITY-TRIPOLI", "رمز المؤشر في المنصة": "SPATIAL-TOURISM-SITES-COUNT", "السنة المقدمة": 2024, "القيمة المقدمة": 18, "الوحدة المطلوبة": "موقع", "الفترة": "سنوي كامل", "المصدر الرسمي / اسم التقرير": "تقرير رسمي", "رقم الجدول أو الصفحة": "ص 18", "رقم المرجع أو الرابط": "https://example.gov.ly/report" }],
    });
    expect(result).toMatchObject({ jobId: 91, acceptedRows: 1, rejectedRows: 0, ignoredRows: 0 });
    expect(dbMock.upsertSpatialObservation).toHaveBeenCalledWith(expect.objectContaining({ spatialAreaId: 4, indicatorId: 90001, verificationStatus: "draft", period: "annual", quarter: "annual" }));
  });

  it("rejects an attempt to overwrite a reviewed or approved city measurement", async () => {
    dbMock.getSpatialAreasByCodes.mockResolvedValue([{ id: 4, code: "CITY-TRIPOLI", type: "city", status: "active" }]);
    dbMock.getIndicatorsByCodes.mockResolvedValue([{ id: 90001, code: "SPATIAL-TOURISM-SITES-COUNT", unit: "موقع" }]);
    dbMock.getSpatialObservationForPeriod.mockResolvedValue({ id: 99, verificationStatus: "approved", enteredBy: 1 });
    dbMock.createImportJob.mockResolvedValue(92);
    const result = await appRouter.createCaller(analystContext()).imports.processCityTemplate({
      fileName: "city-request.xlsx",
      rows: [{ "رمز المدينة": "CITY-TRIPOLI", "رمز المؤشر في المنصة": "SPATIAL-TOURISM-SITES-COUNT", "السنة المقدمة": 2024, "القيمة المقدمة": 18, "الوحدة المطلوبة": "موقع", "الفترة": "سنوي كامل", "المصدر الرسمي / اسم التقرير": "تقرير رسمي", "رقم الجدول أو الصفحة": "ص 18", "رقم المرجع أو الرابط": "https://example.gov.ly/report" }],
    });
    expect(result).toMatchObject({ acceptedRows: 0, rejectedRows: 1 });
    expect(dbMock.upsertSpatialObservation).not.toHaveBeenCalled();
    expect(dbMock.createImportIssues).toHaveBeenCalledWith(92, expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining("قياس قائم") })]));
  });
});
