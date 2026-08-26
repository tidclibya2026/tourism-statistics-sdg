// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mutate = vi.fn();
const dashboardData = {
  summary: { totalIndicators: 2, publishedIndicators: 2, approvedObservations: 4, latestYear: 2025, indicatorsWithTargets: 1, achievedTargets: 1 },
  indicators: [{ id: 1, name: "الوافدون", unit: "عدد" }, { id: 2, name: "ليالي الإقامة", unit: "ليلة" }],
  availableYears: [2025],
  axisDistribution: [{ axis: "اقتصادي", count: 2 }, { axis: "اجتماعي", count: 0 }, { axis: "بيئي", count: 0 }],
  trendByYear: [{ year: 2025, observations: 4 }],
  coverageByYear: [{ year: 2025, indicators: 2 }],
  axisCoverageByYear: [{ year: 2025, اقتصادي: 4, اجتماعي: 0, بيئي: 0 }],
  targetPerformance: [{ indicatorId: 1, name: "الوافدون", code: "ARR", axis: "اقتصادي", unit: "عدد", year: 2025, actual: 100, target: 100, variance: 0, attainment: 100, status: "achieved" as const }],
  latest: [{ indicator: { id: 1, name: "الوافدون", unit: "عدد" }, observation: { year: 2025, value: "100" } }, { indicator: { id: 2, name: "ليالي الإقامة", unit: "ليلة" }, observation: { year: 2025, value: "250" } }],
  recent: [],
  indicatorGrowth: [{ indicatorId: 1, name: "الوافدون", unit: "عدد", firstYear: 2024, lastYear: 2025, growthPercent: 25 }],
};

vi.mock("@/lib/trpc", () => ({
  trpc: {
    dashboard: {
      summary: { useQuery: () => ({ data: dashboardData, isLoading: false, isError: false, refetch: vi.fn() }) },
      narrative: { useMutation: () => ({ data: { text: "## الملخص التنفيذي\n\nتم تحقيق المستهدف." }, mutate, isPending: false, isError: false }) },
    },
    spatial: { overview: { useQuery: () => ({ data: { availableYears: [2025], observations: [{ areaName: "طرابلس", areaType: "city", year: 2025 }] }, isLoading: false, isError: false }) } },
  },
}));

vi.mock("streamdown", () => ({ Streamdown: ({ children }: { children: string }) => children }));

import Home from "../client/src/pages/Home";

Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { value: () => undefined });
Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", { value: () => false });
Object.defineProperty(HTMLElement.prototype, "setPointerCapture", { value: () => undefined });
Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", { value: () => undefined });
vi.stubGlobal("ResizeObserver", class {
  observe() {}
  unobserve() {}
  disconnect() {}
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("dashboard export and AI summary UI", () => {
  it("changes the SDG filter then generates and renders the AI narrative for that scope", () => {
    render(<Home />);
    expect(screen.getByText("هدف التنمية")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Excel" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "PDF" })).toBeTruthy();
    expect(screen.getByText("نطاق العرض المعتمد")).toBeTruthy();
    expect(screen.getByText(/الملخص التنفيذي/)).toBeTruthy();
    const sdgFilter = screen.getAllByRole("combobox")[4];
    fireEvent.pointerDown(sdgFilter, { button: 0, pointerType: "mouse" });
    fireEvent.click(screen.getByText("SDG 8"));
    fireEvent.click(screen.getByRole("button", { name: "توليد التقرير النصي" }));
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ year: undefined, sdgReference: "SDG 8" }));
  });

  it("يعرض مؤشرين مختلفين جنباً إلى جنب مع وحدات القياس", () => {
    render(<Home />);
    const first = screen.getAllByRole("combobox")[5];
    fireEvent.pointerDown(first, { button: 0, pointerType: "mouse" });
    fireEvent.click(screen.getByRole("option", { name: "الوافدون" }));
    const second = screen.getAllByRole("combobox")[6];
    fireEvent.pointerDown(second, { button: 0, pointerType: "mouse" });
    fireEvent.click(screen.getByRole("option", { name: "ليالي الإقامة" }));
    expect(screen.getByText("مقارنة المؤشرات")).toBeTruthy();
    expect(screen.getByRole("button", { name: "لقطة صورة" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "لقطة PDF" })).toBeTruthy();
    expect(screen.getByText("الوحدة: عدد · السنة: 2025")).toBeTruthy();
    expect(screen.getByText("الوحدة: ليلة · السنة: 2025")).toBeTruthy();
  });

  it("يعرض مؤشرات الملخص والنطاق المعتمد ويدعم تبديل محور العرض", () => {
    render(<Home />);
    expect(screen.getByText("القياسات المعتمدة")).toBeTruthy();
    expect(screen.getByText("أكثر المناطق نشاطاً")).toBeTruthy();
    expect(screen.getByText("أعلى المؤشرات نمواً")).toBeTruthy();
    expect(screen.getByText("طرابلس")).toBeTruthy();
    expect(screen.getByText("2025")).toBeTruthy();
    expect(screen.queryByText("2.025")).toBeNull();
    const axisFilter = screen.getAllByRole("combobox")[2];
    fireEvent.pointerDown(axisFilter, { button: 0, pointerType: "mouse" });
    fireEvent.click(screen.getByRole("option", { name: "اقتصادي" }));
    expect(screen.getByText("نسبة تحقيق المستهدفات")).toBeTruthy();
    expect(screen.getAllByText("الوافدون").length).toBeGreaterThanOrEqual(1);
  });
});
