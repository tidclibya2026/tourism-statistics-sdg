import { describe, expect, it } from "vitest";
import { importTemplateUrl } from "../client/src/lib/importTemplate";

describe("import template link", () => {
  it("exposes the approved Excel template through project storage", () => {
    expect(importTemplateUrl).toMatch(/^\/manus-storage\/.+\.xlsx$/);
  });
});

