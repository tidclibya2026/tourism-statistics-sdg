import type { Server } from "node:http";
import { ENV } from "./env";
import { logOperationalEvent, safeErrorMetadata } from "./observability";
import { runtimeState, type RuntimeState } from "./runtimeState";

type ShutdownSignal = "SIGTERM" | "SIGINT";

export function createGracefulShutdown(
  server: Server,
  options: {
    timeoutMs?: number;
    state?: RuntimeState;
    exit?: (code: number) => void;
  } = {}
) {
  const timeoutMs = options.timeoutMs ?? ENV.shutdownTimeoutMs;
  const state = options.state ?? runtimeState;
  const exit = options.exit ?? (code => process.exit(code));
  let started = false;

  return (signal: ShutdownSignal) => {
    if (started) return;
    started = true;
    state.shuttingDown = true;
    logOperationalEvent("info", "graceful_shutdown_started", { signal, timeoutMs });

    const forcedExit = setTimeout(() => {
      logOperationalEvent("error", "graceful_shutdown_timed_out", { signal, timeoutMs });
      server.closeAllConnections?.();
      exit(1);
    }, timeoutMs);
    forcedExit.unref();

    server.close(error => {
      clearTimeout(forcedExit);
      if (error) {
        logOperationalEvent("error", "graceful_shutdown_failed", safeErrorMetadata(error));
        exit(1);
        return;
      }
      logOperationalEvent("info", "graceful_shutdown_completed", { signal });
      exit(0);
    });
    server.closeIdleConnections?.();
  };
}

export function registerGracefulShutdown(server: Server) {
  const shutdown = createGracefulShutdown(server);
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}
