// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CityQuickPreview } from "../client/src/pages/SpatialExplorer";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("city quick preview", () => {
  it("shows approved-only summary data and adds the city to comparison only when an indicator is selected", () => {
    const addToCompare = vi.fn();
    const openChange = vi.fn();
    const detail = vi.fn();
    render(<CityQuickPreview city={{ id: 7, name: "طرابلس", code: "CITY-TRIPOLI" }} stat={{ count: 5, latestYear: 2013, latestValue: 313, unit: "مرفق", indicatorName: "مرافق الإيواء" }} canCompare onOpenChange={openChange} onAddToCompare={addToCompare} onDetail={detail} />);
    expect(screen.getByText("طرابلس")).toBeTruthy();
    expect(screen.getByText("مرافق الإيواء")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "إضافة إلى المقارنة" }));
    expect(addToCompare).toHaveBeenCalledWith(7);
    fireEvent.click(screen.getByRole("button", { name: "التفاصيل الكاملة" }));
    expect(detail).toHaveBeenCalledWith(7);
  });

  it("does not allow a mixed-unit comparison before an indicator is chosen", () => {
    render(<CityQuickPreview city={{ id: 7, name: "طرابلس", code: "CITY-TRIPOLI" }} stat={{ count: 0, latestYear: null, latestValue: null, unit: null, indicatorName: null }} canCompare={false} onOpenChange={vi.fn()} onAddToCompare={vi.fn()} onDetail={vi.fn()} />);
    expect(screen.getByText(/حدّد مؤشراً من المرشح أولاً/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "إضافة إلى المقارنة" }).getAttribute("disabled")).not.toBeNull();
  });
});
