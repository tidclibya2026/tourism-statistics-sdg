import { readFile } from "node:fs/promises";
import path from "node:path";
import { ENV } from "./_core/env";
import * as db from "./db";

type RegistryFetch = typeof fetch;

type NpmAdvisory = {
  id?: string | number;
  severity?: string;
  title?: string;
};

type NpmBulkResponse = Record<string, NpmAdvisory[]>;

export type DependencyReviewSummary = {
  criticalCount: number;
  highCount: number;
  moderateCount: number;
  lowCount: number;
  advisoryCount: number;
};

const MAX_REGISTRY_RESPONSE_BYTES = 1_000_000;
const REGISTRY_TIMEOUT_MS = 15_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeVersion(value: string) {
  const candidate = value.trim().replace(/^[~^=v\s]+/, "");
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(candidate) ? candidate : null;
}

/**
 * Reads declared production dependencies only. It intentionally excludes devDependencies and never mutates the package tree.
 */
export async function loadProductionDependencyInventory(rootDirectory = process.cwd()) {
  const manifestText = await readFile(path.join(rootDirectory, "package.json"), "utf8");
  const manifest: unknown = JSON.parse(manifestText);
  if (!isRecord(manifest) || !isRecord(manifest.dependencies)) {
    throw new Error("تعذر قراءة قائمة التبعيات الإنتاجية.");
  }
  const entries = await Promise.all(Object.keys(manifest.dependencies).map(async (name) => {
    try {
      const installedText = await readFile(path.join(rootDirectory, "node_modules", name, "package.json"), "utf8");
      const installed: unknown = JSON.parse(installedText);
      const version = isRecord(installed) && typeof installed.version === "string" ? normalizeVersion(installed.version) : null;
      return version ? [name, version] as const : null;
    } catch {
      return null;
    }
  }));
  const installedEntries = entries.filter((entry): entry is readonly [string, string] => entry !== null);
  if (installedEntries.length === 0 || installedEntries.length > 150) {
    throw new Error("قائمة التبعيات الإنتاجية غير صالحة للمراجعة.");
  }
  return Object.fromEntries(installedEntries.map(([name, version]) => [name, [version]]));
}

export function summarizeNpmBulkAdvisories(payload: unknown): DependencyReviewSummary {
  if (!isRecord(payload)) throw new Error("استجابة سجل التنبيهات غير صالحة.");
  const advisoryKeys = new Set<string>();
  const summary: DependencyReviewSummary = { criticalCount: 0, highCount: 0, moderateCount: 0, lowCount: 0, advisoryCount: 0 };
  for (const [packageName, advisories] of Object.entries(payload)) {
    if (!Array.isArray(advisories)) throw new Error("استجابة سجل التنبيهات غير صالحة.");
    for (const advisory of advisories) {
      if (!isRecord(advisory)) throw new Error("استجابة سجل التنبيهات غير صالحة.");
      const id = typeof advisory.id === "string" || typeof advisory.id === "number" ? String(advisory.id) : "";
      const title = typeof advisory.title === "string" ? advisory.title.slice(0, 160) : "unknown";
      const key = `${id || "no-id"}:${packageName}:${title}`;
      if (advisoryKeys.has(key)) continue;
      advisoryKeys.add(key);
      const severity = typeof advisory.severity === "string" ? advisory.severity.toLowerCase() : "";
      if (severity === "critical") summary.criticalCount += 1;
      if (severity === "high") summary.highCount += 1;
      if (severity === "moderate") summary.moderateCount += 1;
      if (severity === "low") summary.lowCount += 1;
    }
  }
  summary.advisoryCount = advisoryKeys.size;
  return summary;
}

async function readBoundedResponse(response: Response) {
  const advertisedLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(advertisedLength) && advertisedLength > MAX_REGISTRY_RESPONSE_BYTES) {
    throw new Error("تجاوزت استجابة سجل التنبيهات الحد المسموح.");
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_REGISTRY_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("تجاوزت استجابة سجل التنبيهات الحد المسموح.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export function getDeploymentEnvironment() {
  return process.env.TOURISM_DEPLOYMENT_ENV ?? ENV.deploymentEnvironment;
}

export async function runDependencyReview(options: {
  trigger: "manual" | "scheduled";
  initiatedBy?: number | null;
  fetchImpl?: RegistryFetch;
  inventoryLoader?: typeof loadProductionDependencyInventory;
}) {
  if (getDeploymentEnvironment() !== "staging") {
    throw new Error("مراجعة التبعيات تعمل في بيئة الاختبار فقط.");
  }
  const startedAt = new Date();
  try {
    const inventory = await (options.inventoryLoader ?? loadProductionDependencyInventory)();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REGISTRY_TIMEOUT_MS);
    let response: Response;
    try {
      response = await (options.fetchImpl ?? fetch)("https://registry.npmjs.org/-/npm/v1/security/advisories/bulk", {
        method: "POST",
        headers: { "content-type": "application/json", "accept": "application/json" },
        body: JSON.stringify(inventory),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw new Error("تعذر الاتصال بسجل التنبيهات.");
    const parsed = JSON.parse(await readBoundedResponse(response)) as unknown;
    const counts = summarizeNpmBulkAdvisories(parsed);
    const completedAt = new Date();
    const dependencyCount = Object.keys(inventory).length;
    const summary = `تمت مراجعة ${dependencyCount} حزمة إنتاج مباشرة: حرج ${counts.criticalCount}، عالٍ ${counts.highCount}، متوسط ${counts.moderateCount}، منخفض ${counts.lowCount}. هذه نتيجة تقرير فقط ولا تغير الحزم أو تنشر إلى البيئة الحية.`;
    const id = await db.recordDependencyReviewRun({ ...counts, trigger: options.trigger, status: "completed", summary, initiatedBy: options.initiatedBy ?? null, startedAt, completedAt });
    return { id, status: "completed" as const, ...counts, summary, startedAt, completedAt };
  } catch (error) {
    const completedAt = new Date();
    const message = "تعذرت مراجعة سجل التنبيهات. لم يحدث أي تغيير في الحزم أو البيئة الحية.";
    try {
      await db.recordDependencyReviewRun({ trigger: options.trigger, status: "failed", criticalCount: 0, highCount: 0, moderateCount: 0, lowCount: 0, summary: message, errorMessage: message, initiatedBy: options.initiatedBy ?? null, startedAt, completedAt });
    } catch {
      // لا تطبع سبب الفشل أو أجسام الاستجابة كي لا تظهر تفاصيل تشغيلية حساسة في السجل.
    }
    throw error instanceof Error ? error : new Error(message);
  }
}
