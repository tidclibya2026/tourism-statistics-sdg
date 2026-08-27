// @vitest-environment jsdom
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mutate = vi.hoisted(() => vi.fn());
const mutationOptions = vi.hoisted(() => ({ current: null as null | { onSuccess?: (result: unknown, variables: { question: string }) => void } }));
vi.mock("@/lib/trpc", () => ({ trpc: { assistant: { data: { useMutation: (options: typeof mutationOptions.current) => { mutationOptions.current = options; return { mutate, isPending: false }; } } } } }));
vi.mock("streamdown", () => ({ Streamdown: ({ children }: { children: string }) => children }));

import { DataAssistantPanel } from "../client/src/components/DataAssistantPanel";
import { getSuggestedPrompts } from "../client/src/lib/dataAssistantPrompts";

describe("data assistant UI", () => {
  beforeEach(() => {
    cleanup();
    mutate.mockReset();
    mutationOptions.current = null;
    window.localStorage.clear();
  });
  afterEach(() => cleanup());

  it("يعرض سياسة المصدر الواحد والأسئلة المقترحة والفلاتر", () => {
    render(<DataAssistantPanel />);
    expect(screen.getByText("مساعد بيانات المرصد")).toBeTruthy();
    expect(screen.getByText(/المعتمدة فقط/)).toBeTruthy();
    expect(screen.getByText("ما أحدث قيمة معتمدة للمؤشرات الاقتصادية؟")).toBeTruthy();
    expect(screen.getByText("نطاق البيانات")).toBeTruthy();
    expect(screen.getByText("كل المحاور")).toBeTruthy();
  });

  it("يغيّر الأسئلة المقترحة حسب المحور المختار", () => {
    expect(getSuggestedPrompts("اقتصادي")).toContain("ما المؤشرات الاقتصادية الأعلى نمواً؟");
    expect(getSuggestedPrompts("بيئي")).toContain("ما أحدث المؤشرات البيئية المعتمدة؟");
    expect(getSuggestedPrompts("سياحي")).toContain("ما المدن والبلديات الأعلى في المؤشر السياحي؟");
  });

  it("يعرض زر مسح السجل وتصدير السجل الكامل للمحادثات المحفوظة", () => {
    window.localStorage.setItem("tidc-data-assistant-history-v1", JSON.stringify([{ id: 1, question: "سؤال محفوظ", answer: "إجابة محفوظة", context: { axis: "اقتصادي", scope: "national", sources: ["تقرير رسمي"], counts: { approvedNationalAnnualRows: 1, approvedSpatialRows: 0, calculatedForecastPoints: 0 } } }]));
    render(<DataAssistantPanel />);
    expect(screen.getByRole("button", { name: "مسح السجل" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "تصدير الكل PDF" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "مسح السجل" }));
    expect(screen.getByText("تأكيد مسح سجل المساعد")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "نعم، مسح السجل بالكامل" }));
    expect(screen.queryByText("سجل أسئلة المساعد")).toBeNull();
    expect(window.localStorage.getItem("tidc-data-assistant-history-v1")).toBe("[]");
  });

  it("يعرض السجل ويتيح تصدير الإجابة مع مصادرها بعد نجاح الإجابة", async () => {
    render(<DataAssistantPanel />);
    const input = screen.getByPlaceholderText("اكتب سؤالاً عن الأرقام والمؤشرات المعتمدة…");
    fireEvent.change(input, { target: { value: "ما أحدث قيمة؟" } });
    mutate.mockImplementation((variables: { question: string }) => mutationOptions.current?.onSuccess?.({ answer: "إجابة معتمدة", context: { axis: "اقتصادي", scope: "national", sources: ["تقرير رسمي"], counts: { approvedNationalAnnualRows: 2, approvedSpatialRows: 0, calculatedForecastPoints: 0 } } }, variables));
    fireEvent.submit(input.closest("form")!);
    expect(screen.getByText("سجل أسئلة المساعد")).toBeTruthy();
    expect(screen.getByText("مصادر السجلات المستخدمة")).toBeTruthy();
    expect(screen.getByRole("button", { name: "تصدير PDF" })).toBeTruthy();
    expect(screen.getByText(/إصدار المنصة/)).toBeTruthy();
  });
});
