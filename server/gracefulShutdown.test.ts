import type { Server } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { createGracefulShutdown } from "./_core/gracefulShutdown";

describe("graceful shutdown", () => {
  it("marks readiness unavailable, drains once and exits successfully", () => {
    let closeCallback: ((error?: Error) => void) | undefined;
    const closeIdleConnections = vi.fn();
    const close = vi.fn((callback: (error?: Error) => void) => {
      closeCallback = callback;
      return server;
    });
    const server = { close, closeIdleConnections, closeAllConnections: vi.fn() } as unknown as Server;
    const state = { shuttingDown: false };
    const exit = vi.fn();
    const shutdown = createGracefulShutdown(server, { state, exit, timeoutMs: 5_000 });

    shutdown("SIGTERM");
    shutdown("SIGINT");
    expect(state.shuttingDown).toBe(true);
    expect(close).toHaveBeenCalledTimes(1);
    expect(closeIdleConnections).toHaveBeenCalledOnce();
    closeCallback?.();
    expect(exit).toHaveBeenCalledWith(0);
  });
});
