// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mutate = vi.hoisted(() => vi.fn());
const mutationOptions = vi.hoisted(
  () => ({ current: null as null | { onSuccess?: (result: unknown) => void } })
);

vi.mock("@/lib/trpc", () => ({
  trpc: {
    assistant: {
      data: {
        useMutation: (options: typeof mutationOptions.current) => {
          mutationOptions.current = options;
          return { mutate, isPending: false };
        },
      },
    },
  },
}));
vi.mock("streamdown", () => ({
  Streamdown: ({ children }: { children: string }) => <>{children}</>,
}));

import { SmartTourismSearch } from "../client/src/components/SmartTourismSearch";

afterEach(() => {
  cleanup();
  mutate.mockReset();
  mutationOptions.current = null;
});

describe("smart tourism search UI", () => {
  it("يرسل سؤالاً باللغة الطبيعية مع المحور والنطاق المختارين", () => {
    render(<SmartTourismSearch />);
    fireEvent.change(screen.getByRole("textbox", { name: "سؤال البحث الذكي" }), {
      target: { value: "ما أحدث قيمة للزوار في طرابلس؟" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "محور البحث" }), {
      target: { value: "سياحي" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "نطاق البحث" }), {
      target: { value: "spatial" },
    });
    fireEvent.click(screen.getByRole("button", { name: "بحث ذكي" }));

    expect(mutate).toHaveBeenCalledWith({
      question: "ما أحدث قيمة للزوار في طرابلس؟",
      history: [],
      axis: "سياحي",
      scope: "spatial",
    });
  });

  it("يعرض الإجابة وعدادات السياق والمصادر بعد نجاح البحث", () => {
    render(<SmartTourismSearch />);
    act(() => {
      mutationOptions.current?.onSuccess?.({
        answer: "أحدث قياس معتمد هو ١٠٠.",
        context: {
          axis: "سياحي",
          scope: "spatial",
          sources: ["تقرير رسمي"],
          counts: {
            approvedNationalAnnualRows: 2,
            approvedSpatialRows: 3,
            calculatedForecastPoints: 0,
          },
        },
      });
    });

    expect(screen.getByText("أحدث قياس معتمد هو ١٠٠.")).toBeTruthy();
    expect(screen.getByText(/تقرير رسمي/)).toBeTruthy();
    expect(screen.getByText(/قياساً مكانياً معتمداً/)).toBeTruthy();
  });
});
