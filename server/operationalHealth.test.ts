import type { Express } from "express";
import { describe, expect, it } from "vitest";
import {
  probeDatabase,
  registerOperationalHealthRoutes,
  type DatabaseReadiness,
} from "./_core/operationalHealth";

describe("operational health routes", () => {
  it("reports an unconfigured database without attempting a connection", async () => {
    await expect(probeDatabase("", 250)).resolves.toEqual({
      ok: false,
      status: "not_configured",
      latencyMs: 0,
    });
  });

  it("keeps liveness independent and returns 503 when dependencies are unavailable", async () => {
    const handlers = new Map<string, Function>();
    const app = { get: (path: string, handler: Function) => handlers.set(path, handler) } as unknown as Express;
    const unavailable: DatabaseReadiness = { ok: false, status: "timeout", latencyMs: 250 };
    registerOperationalHealthRoutes(app, async () => unavailable);

    const responses: Array<{ status: number; body: unknown }> = [];
    const makeResponse = () => {
      let status = 200;
      return {
        status(value: number) { status = value; return this; },
        json(body: unknown) { responses.push({ status, body }); return this; },
      };
    };
    handlers.get("/healthz")?.({}, makeResponse());
    await handlers.get("/readyz")?.({}, makeResponse());

    expect(responses).toEqual([
      { status: 200, body: { status: "ok" } },
      { status: 503, body: { status: "unavailable", checks: { database: "timeout" } } },
    ]);
  });
});
