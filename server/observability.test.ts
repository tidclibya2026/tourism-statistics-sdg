import { describe, expect, it, vi } from "vitest";
import {
  logOperationalEvent,
  safeErrorMetadata,
  sanitizeOperationalMetadata,
  normalizeOperationalPath,
} from "./_core/observability";

describe("operational observability", () => {
  it("redacts credentials and omits complex values", () => {
    expect(sanitizeOperationalMetadata({
      requestId: "req-1",
      authorization: "Bearer secret",
      databaseUrl: "mysql://user:password@host/db",
      nested: { token: "secret" },
    })).toEqual({
      requestId: "req-1",
      authorization: "[REDACTED]",
      databaseUrl: "[REDACTED]",
      nested: "[OMITTED]",
    });
  });

  it("logs only safe error classification", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = Object.assign(new Error("mysql://user:secret@host/db"), { code: "ECONNREFUSED" });
    logOperationalEvent("warn", "probe_failed", safeErrorMetadata(error));
    const entry = String(spy.mock.calls[0]?.[0]);
    expect(entry).toContain("ECONNREFUSED");
    expect(entry).not.toContain("user:secret");
    spy.mockRestore();
  });

  it("removes asset names and identifiers from logged paths", () => {
    expect(normalizeOperationalPath("/manus-storage/private-person-file.pdf")).toBe("/manus-storage/:asset");
    expect(normalizeOperationalPath("/api/items/123")).toBe("/api/items/:id");
  });
});
