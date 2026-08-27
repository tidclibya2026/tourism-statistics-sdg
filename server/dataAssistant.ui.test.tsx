// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

const mutate = vi.fn();
vi.mock("@/lib/trpc", () => ({ trpc: { assistant: { data: { useMutation: () => ({ mutate, isPending: false }) } } } }));
vi.mock("streamdown", () => ({ Streamdown: ({ children }: { children: string }) => children }));

import { DataAssistantPanel } from "../client/src/components/DataAssistantPanel";

describe("data assistant UI", () => {
  it("يعرض سياسة المصدر الواحد والأسئلة المقترحة والفلاتر", () => {
    render(<DataAssistantPanel />);
    expect(screen.getByText("مساعد بيانات المرصد")).toBeTruthy();
    expect(screen.getByText(/المعتمدة فقط/)).toBeTruthy();
    expect(screen.getByText("ما أحدث قيمة معتمدة للمؤشرات الاقتصادية؟")).toBeTruthy();
    expect(screen.getByText("نطاق البيانات")).toBeTruthy();
    expect(screen.getByText("كل المحاور")).toBeTruthy();
  });

  it("يرسل السؤال مع نطاق المؤشرات الوطنية والمحور الاقتصادي", () => {
    render(<DataAssistantPanel />);
    const input = screen.getAllByPlaceholderText("اكتب سؤالاً عن الأرقام والمؤشرات المعتمدة…")[0]!;
    fireEvent.change(input, { target: { value: "ما أحدث قيمة؟" } });
    fireEvent.submit(input.closest("form")!);
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ question: "ما أحدث قيمة؟", scope: "all", history: [] }));
  });
});
