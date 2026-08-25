import { describe, expect, it, vi } from "vitest";
import { exportElementPng } from "../client/src/lib/dashboardPdf";

describe("exportElementPng", () => {
  it("ينشئ تنزيل PNG من لقطة عالية الجودة للعنصر المحدد", async () => {
    const click = vi.fn();
    const anchor = { href: "", download: "", click } as unknown as HTMLAnchorElement;
    vi.stubGlobal("document", { createElement: vi.fn(() => anchor) });
    const capture = vi.fn(async () => ({ toDataURL: () => "data:image/png;base64,flow" }));
    await exportElementPng({} as HTMLElement, "تدفق-المدن.png", capture);
    expect(capture).toHaveBeenCalledOnce();
    expect(anchor.download).toBe("تدفق-المدن.png");
    expect(anchor.href).toContain("data:image/png");
    expect(click).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
