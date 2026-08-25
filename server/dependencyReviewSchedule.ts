import type { Request, Response } from "express";
import * as db from "./db";
import { getDeploymentEnvironment, runDependencyReview } from "./dependencyReview";
import { sdk } from "./_core/sdk";

/** Platform-only entry point. It ignores request bodies and trusts only the authenticated task UID. */
export async function dependencyReviewScheduleHandler(req: Request, res: Response) {
  let taskUid: string | undefined;
  try {
    const cronUser = await sdk.authenticateRequest(req);
    taskUid = cronUser.taskUid;
    if (!cronUser.isCron || !taskUid) return res.status(403).json({ error: "cron-only" });

    const schedule = await db.getDependencyReviewScheduleByTaskUid(taskUid);
    if (!schedule) return res.json({ ok: true, skipped: "orphan" });
    if (schedule.environment !== "staging" || schedule.enabled !== 1) return res.status(403).json({ error: "staging-schedule-required" });
    if (getDeploymentEnvironment() !== "staging") return res.status(409).json({ error: "staging-environment-required" });

    const claimed = await db.claimDependencyReviewScheduleRun(taskUid);
    if (!claimed) return res.json({ ok: true, skipped: "duplicate-window" });

    const result = await runDependencyReview({ trigger: "scheduled" });
    return res.json({ ok: true, run: result });
  } catch {
    return res.status(500).json({
      error: "dependency-review-failed",
      context: { url: req.originalUrl, taskUid: taskUid ?? null },
      timestamp: new Date().toISOString(),
    });
  }
}
