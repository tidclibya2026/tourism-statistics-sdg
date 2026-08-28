import type { Express } from "express";
import mysql from "mysql2/promise";
import { ENV } from "./env";
import { logOperationalEvent, safeErrorMetadata } from "./observability";
import { runtimeState, type RuntimeState } from "./runtimeState";

export type DatabaseReadiness = {
  ok: boolean;
  status: "ready" | "not_configured" | "unavailable" | "timeout";
  latencyMs: number;
};

export async function probeDatabase(
  databaseUrl = ENV.databaseUrl,
  timeoutMs = ENV.readinessTimeoutMs
): Promise<DatabaseReadiness> {
  const started = Date.now();
  if (!databaseUrl) return { ok: false, status: "not_configured", latencyMs: 0 };

  let timeout: NodeJS.Timeout | undefined;
  try {
    const probe = (async () => {
      const connection = await mysql.createConnection(databaseUrl);
      try {
        await connection.query("SELECT 1 AS ok");
      } finally {
        await connection.end().catch(() => undefined);
      }
    })();
    await Promise.race([
      probe,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "READINESS_TIMEOUT" })), timeoutMs);
      }),
    ]);
    return { ok: true, status: "ready", latencyMs: Date.now() - started };
  } catch (error) {
    const timedOut = (error as { code?: unknown })?.code === "READINESS_TIMEOUT";
    logOperationalEvent("warn", "database_readiness_failed", {
      ...safeErrorMetadata(error),
      timedOut,
      latencyMs: Date.now() - started,
    });
    return { ok: false, status: timedOut ? "timeout" : "unavailable", latencyMs: Date.now() - started };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function registerOperationalHealthRoutes(
  app: Express,
  databaseProbe: () => Promise<DatabaseReadiness> = () => probeDatabase(),
  state: RuntimeState = runtimeState
) {
  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
  app.get("/readyz", async (_req, res) => {
    if (state.shuttingDown) {
      res.status(503).json({ status: "shutting_down", checks: { database: "skipped" } });
      return;
    }
    const database = await databaseProbe();
    res.status(database.ok ? 200 : 503).json({
      status: database.ok ? "ready" : "unavailable",
      checks: { database: database.status },
    });
  });
}
