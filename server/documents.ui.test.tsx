// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const role = vi.hoisted(() => ({ value: "viewer" as "viewer" | "admin" }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { role: role.value, name: "مستخدم الاختبار" } }) }));
vi.mock("@/lib/trpc", () => ({ trpc: { auth: { administrativeCapabilities: { useQuery: () => ({ data: role.value === "admin" ? { canReviewSecurity: true, canManageRoles: false, canApproveReleases: false } : undefined, isLoading: false }) } } } }));
vi.mock("@/lib/documentLibrary", () => ({ documentCategories: () => ["معمارية", "أمن"], documentLibrary: [{ fileName: "01/a.md", title: "دليل المعمارية", description: "شرح الطبقات", category: "معمارية", content: "# معماري" }, { fileName: "02/b.md", title: "دليل الأمن", description: "شرح الأمن", category: "أمن", content: "# أمن" }] }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import Documents from "../client/src/pages/Documents";

afterEach(() => { cleanup(); role.value = "viewer"; });

describe("documents library UI", () => {
  it("shows searchable documents and hides ZIP export from viewers", () => {
    render(<Documents />);
    expect(screen.getByRole("heading", { name: "مكتبة الوثائق" })).toBeTruthy();
    expect(screen.getByText("دليل المعمارية")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "تصدير حزمة ZIP" })).toBeNull();
    fireEvent.change(screen.getByRole("textbox", { name: "البحث في مكتبة الوثائق" }), { target: { value: "الأمن" } });
    expect(screen.getByText("دليل الأمن")).toBeTruthy();
    expect(screen.queryByText("دليل المعمارية")).toBeNull();
  });

  it("shows ZIP export only for an admin with a delegated capability", () => {
    role.value = "admin";
    render(<Documents />);
    expect(screen.getByRole("button", { name: "تصدير حزمة ZIP" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "تنزيل الدليل" })).toHaveLength(2);
  });
});
