// @vitest-environment jsdom
import { fireEvent, render, screen, cleanup, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mutate = vi.hoisted(() => vi.fn());
const mutationOptions = vi.hoisted(() => ({ current: null as null | { onSuccess?: (result: unknown, variables: { question: string }) => void } }));
vi.mock("@/lib/trpc", () => ({ trpc: { assistant: { data: { useMutation: (options: typeof mutationOptions.current) => { mutationOptions.current = options; return { mutate, isPending: false }; } } } } }));
vi.mock("streamdown", () => ({ Streamdown: ({ children }: { children: string }) => children }));
vi.mock("@/lib/dashboardPdf", () => ({ exportDashboardPdf: vi.fn(() => Promise.resolve()) }));

import { DataAssistantPanel } from "../client/src/components/DataAssistantPanel";
import { getSuggestedPrompts } from "../client/src/lib/dataAssistantPrompts";

describe("data assistant UI", () => {
  beforeEach(() => {
    cleanup();
    mutate.mockReset();
    mutationOptions.current = null;
    window.localStorage.clear();
    window.history.replaceState(null, "", "/help");
  });
  afterEach(() => cleanup());

  it("يعرض مؤشر عدد الفلاتر النشطة ويتحدث مع إعادة الضبط", () => {
    window.localStorage.setItem("tidc-data-assistant-history-v1", JSON.stringify([{ id: 1, question: "سؤال", answer: "إجابة", context: { axis: "اقتصادي", scope: "national", sources: ["مصدر"], counts: { approvedNationalAnnualRows: 1, approvedSpatialRows: 0, calculatedForecastPoints: 0 } } }]));
    render(<DataAssistantPanel />);
    expect(screen.queryByText("1 فلاتر نشطة")).toBeNull();
    fireEvent.change(screen.getByRole("textbox", { name: "بحث في سجل المحادثات" }), { target: { value: "سؤال" } });
    expect(screen.getByText("1 فلاتر نشطة")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("تصفية حسب مصدر البيانات"), { target: { value: "مصدر" } });
    expect(screen.getByText("2 فلاتر نشطة")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "إعادة ضبط الفلاتر" }));
    expect(screen.queryByText(/فلاتر نشطة/)).toBeNull();
  });

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

  it("يحدد الكل ويلغي التحديد ويحفظ الاختيارات محلياً ويعرض تقدم التصدير", async () => {
    window.localStorage.setItem("tidc-data-assistant-history-v1", JSON.stringify([{ id: 1, question: "سؤال أول", answer: "إجابة أولى", context: { axis: "اقتصادي", scope: "national", sources: ["تقرير رسمي"], counts: { approvedNationalAnnualRows: 1, approvedSpatialRows: 0, calculatedForecastPoints: 0 } } }, { id: 2, question: "سؤال ثان", answer: "إجابة ثانية", context: { axis: "سياحي", scope: "spatial", sources: ["سجل مكاني"], counts: { approvedNationalAnnualRows: 0, approvedSpatialRows: 1, calculatedForecastPoints: 0 } } }]));
    window.localStorage.setItem("tidc-data-assistant-selected-v1", JSON.stringify([1]));
    render(<DataAssistantPanel />);
    expect(screen.getByRole("button", { name: "تصدير المحدد PDF (1)" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "تصدير المحدد Excel" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "تحديد الكل" }));
    await waitFor(() => expect(window.localStorage.getItem("tidc-data-assistant-selected-v1")).toBe("[2,1]"));
    expect(screen.getByRole("button", { name: "تصدير المحدد PDF (2)" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "إلغاء تحديد الكل" }));
    await waitFor(() => expect(window.localStorage.getItem("tidc-data-assistant-selected-v1")).toBe("[]"));
  });

  it("يصفّي سجل المحادثات بشريط البحث ويعرض خيار Excel للمحدد", async () => {
    window.localStorage.setItem("tidc-data-assistant-history-v1", JSON.stringify([{ id: 1, question: "ما أحدث مؤشر اقتصادي؟", answer: "إجابة اقتصادية", context: { axis: "اقتصادي", scope: "national", sources: ["تقرير رسمي"], counts: { approvedNationalAnnualRows: 1, approvedSpatialRows: 0, calculatedForecastPoints: 0 } } }, { id: 2, question: "ما أحدث مؤشر سياحي؟", answer: "إجابة سياحية", context: { axis: "سياحي", scope: "spatial", sources: ["سجل مكاني"], counts: { approvedNationalAnnualRows: 0, approvedSpatialRows: 1, calculatedForecastPoints: 0 } } }]));
    render(<DataAssistantPanel />);
    const search = screen.getByRole("textbox", { name: "بحث في سجل المحادثات" });
    fireEvent.change(search, { target: { value: "اقتصادي" } });
    expect(screen.getByText("ما أحدث مؤشر اقتصادي؟")).toBeTruthy();
    expect(screen.queryByText("ما أحدث مؤشر سياحي؟")).toBeNull();
    expect(screen.getByRole("button", { name: "تصدير المحدد Excel" })).toBeTruthy();
  });

  it("يفلتر السجل حسب المحور والتاريخ ويفرز الأقدم ويعرض تصدير النتائج الحالية", async () => {
    window.localStorage.setItem("tidc-data-assistant-history-v1", JSON.stringify([{ id: new Date("2026-08-20T10:00:00Z").getTime(), question: "سؤال اقتصادي", answer: "إجابة اقتصادية", context: { axis: "اقتصادي", scope: "national", sources: ["تقرير رسمي"], counts: { approvedNationalAnnualRows: 1, approvedSpatialRows: 0, calculatedForecastPoints: 0 } } }, { id: new Date("2026-08-25T10:00:00Z").getTime(), question: "سؤال بيئي", answer: "إجابة بيئية", context: { axis: "بيئي", scope: "national", sources: ["سجل بيئي"], counts: { approvedNationalAnnualRows: 1, approvedSpatialRows: 0, calculatedForecastPoints: 0 } } }]));
    render(<DataAssistantPanel />);
    fireEvent.change(screen.getByRole("combobox", { name: "تصفية حسب المحور" }), { target: { value: "اقتصادي" } });
    fireEvent.change(screen.getByRole("combobox", { name: "ترتيب سجل المحادثات" }), { target: { value: "oldest" } });
    fireEvent.change(screen.getByLabelText("تصفية من تاريخ"), { target: { value: "2026-08-19" } });
    fireEvent.change(screen.getByLabelText("تصفية إلى تاريخ"), { target: { value: "2026-08-21" } });
    expect(screen.getByText("سؤال اقتصادي")).toBeTruthy();
    expect(screen.queryByText("سؤال بيئي")).toBeNull();
    expect(screen.getByRole("button", { name: /تصدير نتائج البحث PDF/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /تصدير نتائج البحث Excel/ })).toBeTruthy();
  });

  it("يعيد ضبط الفلاتر ويصفي حسب المصدر وينسخ رابط الإعدادات", async () => {
    window.localStorage.setItem("tidc-data-assistant-history-v1", JSON.stringify([{ id: 1, question: "سؤال مصدر أ", answer: "إجابة", context: { axis: "اقتصادي", scope: "national", sources: ["مصدر أ"], counts: { approvedNationalAnnualRows: 1, approvedSpatialRows: 0, calculatedForecastPoints: 0 } } }, { id: 2, question: "سؤال مصدر ب", answer: "إجابة", context: { axis: "بيئي", scope: "national", sources: ["مصدر ب"], counts: { approvedNationalAnnualRows: 1, approvedSpatialRows: 0, calculatedForecastPoints: 0 } } }]));
    render(<DataAssistantPanel />);
    fireEvent.change(screen.getByLabelText("تصفية حسب مصدر البيانات"), { target: { value: "مصدر أ" } });
    expect(screen.getByText("سؤال مصدر أ")).toBeTruthy();
    expect(screen.queryByText("سؤال مصدر ب")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "نسخ رابط الفلاتر" }));
    fireEvent.click(screen.getByRole("button", { name: "إعادة ضبط الفلاتر" }));
    expect((screen.getByLabelText("تصفية حسب مصدر البيانات") as HTMLSelectElement).value).toBe("");
    expect((screen.getByLabelText("بحث في سجل المحادثات") as HTMLInputElement).value).toBe("");
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
