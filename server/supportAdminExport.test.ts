import { describe, expect, it, vi } from "vitest";

const xlsxMock = vi.hoisted(() => ({ book_new: vi.fn(() => ({})), json_to_sheet: vi.fn((rows) => ({ rows })), book_append_sheet: vi.fn(), writeFile: vi.fn() }));
vi.mock("xlsx", () => ({ utils: { book_new: xlsxMock.book_new, json_to_sheet: xlsxMock.json_to_sheet, book_append_sheet: xlsxMock.book_append_sheet }, writeFile: xlsxMock.writeFile }));
vi.mock("html2canvas", () => ({ default: vi.fn() }));
vi.mock("jspdf", () => ({ default: class { addImage = vi.fn(); addPage = vi.fn(); save = vi.fn(); } }));

import { downloadSupportExcel } from "../client/src/lib/supportAdminExport";

describe("support administration exports", () => {
  it("ينشئ Excel من الطلبات والتقييمات وبيانات الرسوم الفعلية", () => {
    downloadSupportExcel([{ id: 3, roleSnapshot: "viewer", status: "open", category: "issue", subject: "مشكلة الاستيراد", message: "الاستيراد لا يعمل", createdAt: new Date("2026-01-01"), submitterName: "مستخدم", replies: [] }], [{ sectionId: "data-entry", role: "viewer", helpful: 2, notHelpful: 1 }]);
    expect(xlsxMock.book_append_sheet).toHaveBeenCalledTimes(4);
    expect(xlsxMock.book_append_sheet).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), "طلبات الدعم");
    expect(xlsxMock.book_append_sheet).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), "تقييمات المساعدة");
    expect(xlsxMock.writeFile).toHaveBeenCalledWith(expect.any(Object), expect.stringContaining("تقرير-إدارة-الدعم-"));
  });
});
