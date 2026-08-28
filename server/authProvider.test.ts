import { describe, expect, it } from "vitest";
import {
  getAuthProvider,
  normalizeAuthProvider,
} from "./_core/authProvider";

describe("authentication provider selection", () => {
  it("keeps Manus as the backwards-compatible default", () => {
    expect(normalizeAuthProvider(undefined)).toBe("manus");
    expect(getAuthProvider("manus").name).toBe("manus");
  });

  it("selects the institutional OIDC provider explicitly", () => {
    expect(normalizeAuthProvider(" OIDC ")).toBe("oidc");
    expect(getAuthProvider("oidc").name).toBe("oidc");
  });
});
