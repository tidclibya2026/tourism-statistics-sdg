// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const indicator = {
  id: 42,
  code: "ARR-001",
  name: "إجمالي الوافدين",
  axis: "اقتصادي" as const,
  framework: "SDG" as const,
  sdgReference: "SDG 8",
  unit: "عدد",
  status: "published" as const,
  officialSource: "مركز المعلومات والتوثيق السياحي",
  calculationMethod: "العد السنوي",
};

const invalidate = vi.fn();
const refetch = vi.fn();

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: "admin" }, loading: false }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ observations: { list: { invalidate } }, dashboard: { summary: { invalidate } } }),
    indicators: { list: { useQuery: () => ({ data: [indicator], isError: false, refetch }) } },
    observations: {
      list: { useQuery: () => ({ data: [], isError: false, isLoading: false, refetch }) },
      upsert: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      setStatus: { useMutation: () => ({ mutate: vi.fn() }) },
    },
  },
}));

import DataEntry from "../client/src/pages/DataEntry";

Object.defineProperties(HTMLElement.prototype, {
  hasPointerCapture: { value: () => false },
  setPointerCapture: { value: () => undefined },
  releasePointerCapture: { value: () => undefined },
  scrollIntoView: { value: () => undefined },
});

afterEach(() => cleanup());

describe("DataEntry indicator selection", () => {
  it("shows the selected indicator type, framework and unit after a user chooses an indicator", async () => {
    render(<DataEntry />);
    const nativeSelect = document.querySelector("select") as HTMLSelectElement;
    fireEvent.change(nativeSelect, { target: { value: "42" } });

    expect(await screen.findByText("بيانات المؤشر المختار")).toBeTruthy();
    expect(screen.getByText("نوع المؤشر (المحور)")).toBeTruthy();
    expect(screen.getByText("اقتصادي")).toBeTruthy();
    expect(screen.getByText("SDG")).toBeTruthy();
    expect(screen.getByText("عدد")).toBeTruthy();
  });
});
