import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerPublicationApi } from "../publicationApi";
import { applySecurityHeaders, createApiRateLimitMiddleware } from "./security";
import { dependencyReviewScheduleHandler } from "../dependencyReviewSchedule";
import { assertRuntimeEnvironment } from "./envValidation";
import { requestObservability, logOperationalEvent, safeErrorMetadata } from "./observability";
import { registerOperationalHealthRoutes } from "./operationalHealth";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  assertRuntimeEnvironment(process.env);
  const app = express();
  const server = createServer(app);
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(applySecurityHeaders);
  app.use(requestObservability);
  registerOperationalHealthRoutes(app);
  // ملفات Excel تعالج في الواجهة إلى صفوف متحققة؛ لا يحتاج الخادم قبول أجسام ضخمة.
  app.use(express.json({ limit: "8mb" }));
  app.use(
    express.urlencoded({ limit: "8mb", extended: true, parameterLimit: 100 })
  );
  app.use("/api", createApiRateLimitMiddleware());
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerPublicationApi(app);
  app.post("/api/scheduled/dependency-review", dependencyReviewScheduleHandler);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    logOperationalEvent("warn", "preferred_port_unavailable", { preferredPort, selectedPort: port });
  }

  server.listen(port, () => {
    logOperationalEvent("info", "server_started", { port });
  });
}

startServer().catch(error => {
  logOperationalEvent("error", "server_start_failed", safeErrorMetadata(error));
  process.exitCode = 1;
});
