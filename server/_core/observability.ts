import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

const sensitiveKey = /(?:authorization|cookie|password|secret|token|database_?url|api_?key)/i;
const requestIdPattern = /^[A-Za-z0-9._-]{1,64}$/;

export function sanitizeOperationalMetadata(
  metadata: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => {
      if (sensitiveKey.test(key)) return [key, "[REDACTED]"];
      if (typeof value === "string") return [key, value.slice(0, 200)];
      if (typeof value === "number" || typeof value === "boolean" || value === null) return [key, value];
      return [key, "[OMITTED]"];
    })
  );
}

export function safeErrorMetadata(error: unknown) {
  if (!error || typeof error !== "object") return { errorType: "unknown" };
  const candidate = error as { name?: unknown; code?: unknown; status?: unknown };
  return sanitizeOperationalMetadata({
    errorType: typeof candidate.name === "string" ? candidate.name : "Error",
    errorCode: typeof candidate.code === "string" ? candidate.code : null,
    status: typeof candidate.status === "number" ? candidate.status : null,
  });
}

export function logOperationalEvent(
  level: "info" | "warn" | "error",
  event: string,
  metadata: Record<string, unknown> = {}
) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitizeOperationalMetadata(metadata),
  });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.log(entry);
}

export function normalizeOperationalPath(path: string) {
  if (path.startsWith("/manus-storage/")) return "/manus-storage/:asset";
  return path
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id")
    .replace(/\b\d+\b/g, ":id")
    .slice(0, 160);
}

export const requestObservability: RequestHandler = (req, res, next) => {
  const supplied = req.header("x-request-id");
  const requestId = supplied && requestIdPattern.test(supplied) ? supplied : randomUUID();
  const started = Date.now();
  res.setHeader("X-Request-Id", requestId);
  res.on("finish", () => {
    if (req.path === "/healthz") return;
    logOperationalEvent(res.statusCode >= 500 ? "error" : "info", "http_request_completed", {
      requestId,
      method: req.method,
      path: normalizeOperationalPath(req.path),
      status: res.statusCode,
      durationMs: Date.now() - started,
    });
  });
  next();
};
