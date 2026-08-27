// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { exportPdf, writeFile } = vi.hoisted(() => ({ exportPdf: vi.fn(), writeFile: vi.fn() }));

const spatialReportData = { regions: [{ id: 7, name: "طرابلس", type: "region" as const }], cities: [], observations: [{ id: 71, areaId: 7, areaName: "طرابلس", areaType: "region" as const, parentName: null, indicatorId: 9, indicatorCode: "CITY-VISITORS", indicatorName: "زوار طرابلس", unit: "عدد", year: 2025, value: 88, source: "TIDC" }], indicators: [{ id: 9, axis: "اقتصادي" as const, framework: "UNWTO" as const, sdgReference: null }] };

const approvedRows = [
  { observation: { id: 1, year: 2024, period: "annual", quarter: null, value: "120", targetValue: null, source: "TIDC" }, indicator: { name: "إجمالي الزوار", code: "VISITORS", axis: "اقتصادي", framework: "UNWTO", sdgReference: null, unit: "عدد" } },
  { observation: { id: 2, year: 2025, period: "annual", quarter: null, value: "180", targetValue: null, source: "TIDC" }, indicator: { name: "إجمالي الزوار", code: "VISITORS", axis: "اقتصادي", framework: "UNWTO", sdgReference: null, unit: "عدد" } },
];

vi.mock("@/lib/trpc", () => ({
  trpc: { auth: { administrativeCapabilities: { useQuery: () => ({ data: { canApproveReleases: false, canManageRoles: false, canReviewSecurity: false }, isLoading: false }) } }, observations: { list: { useQuery: () => ({ data: approvedRows, isLoading: false, isError: false, refetch: vi.fn() }) } }, spatial: { overview: { useQuery: () => ({ data: spatialReportData, isLoading: false, isError: false, refetch: vi.fn() }) } }, dashboard: { narrative: { useMutation: () => ({ data: null, isPending: false, mutate: vi.fn() }) }, signApprovedReport: { useMutation: () => ({ data: undefined, isPending: false, mutateAsync: vi.fn() }) } } },
}));
vi.mock("@/lib/dashboardPdf", () => ({ openPrintablePdf: exportPdf }));
vi.mock("@/lib/reportExport", () => ({ toExcelReportRows: (rows: unknown[]) => rows.map((_, index) => ({ المؤشر: `صف ${index + 1}` })) }));
vi.mock("xlsx", () => ({ utils: { json_to_sheet: (rows: unknown[]) => ({ "!cols": [], rows }), book_new: () => ({ sheets: [] }), book_append_sheet: (workbook: { sheets: unknown[] }, sheet: unknown, name: string) => { workbook.sheets.push({ name, sheet }); } }, writeFile }));

import Reports from "../client/src/pages/Reports";

vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); });

describe("reports export and chart UI", () => {
  it("يعرض التصدير والرسم التفاعلي مع تبديل نمط الرسم", () => {
    render(<Reports />);
    expect((screen.getByRole("button", { name: /تصدير Excel/ }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: /تصدير PDF/ }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getAllByRole("img", { name: /رسم تفاعلي/ }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/تفاصيل المناطق/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /تحليل ذكي/ }));
    expect(screen.getByRole("button", { name: /أعمدة/ }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: /خطي/ }));
    expect(screen.getByRole("button", { name: /خطي/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it("يحفظ نوع الرسم الافتراضي ويصفّي تقرير المنطقة", () => {
    localStorage.setItem("tourism-user-display-preferences", JSON.stringify({ chartType: "line", language: "ar" }));
    render(<Reports />);
    expect(screen.getByRole("button", { name: /خطي/ }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: /طرابلس/ }));
    expect(screen.getByText("زوار طرابلس")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /أعمدة/ }));
    expect(JSON.parse(localStorage.getItem("tourism-user-display-preferences") || "{}").chartType).toBe("bars");
  });

  it("ينشئ ملفي Excel وPDF من القياسات المعتمدة فقط", () => {
    render(<Reports />);
    fireEvent.click(screen.getByRole("button", { name: /تصدير Excel/ }));
    expect(writeFile).toHaveBeenCalledWith(expect.anything(), "تقرير-المؤشرات-2020-2026.xlsx");
    fireEvent.click(screen.getByRole("button", { name: /تصدير PDF/ }));
    expect(exportPdf).toHaveBeenCalledWith(expect.any(HTMLElement), "تقرير-المؤشرات-2020-2026.pdf");
  });
});
