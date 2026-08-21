import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  type InsertIndicator,
  type InsertIndicatorObservation,
  type InsertUser,
  importIssues,
  importJobs,
  indicatorObservations,
  indicators,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { buildTargetPerformance } from "./dashboardMetrics";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  (["name", "email", "loginMethod"] as const).forEach((field) => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(asc(users.name));
}

export async function updateUserRole(id: number, role: "admin" | "analyst" | "viewer") {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  await db.update(users).set({ role }).where(eq(users.id, id));
}

export async function listIndicators(filters?: { axis?: "اقتصادي" | "اجتماعي" | "بيئي"; framework?: "UNWTO" | "SDG"; status?: "draft" | "published" | "archived" }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [
    filters?.axis ? eq(indicators.axis, filters.axis) : undefined,
    filters?.framework ? eq(indicators.framework, filters.framework) : undefined,
    filters?.status ? eq(indicators.status, filters.status) : undefined,
  ].filter(Boolean);
  const query = db.select().from(indicators);
  return conditions.length > 0 ? query.where(and(...conditions)).orderBy(asc(indicators.name)) : query.orderBy(asc(indicators.name));
}

export async function getIndicatorsByCodes(codes: string[]) {
  const db = await getDb();
  if (!db || codes.length === 0) return [];
  return db.select().from(indicators).where(inArray(indicators.code, codes));
}

export async function getIndicatorById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(indicators).where(eq(indicators.id, id)).limit(1);
  return result[0];
}

export async function createIndicator(values: InsertIndicator) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  const result = await db.insert(indicators).values(values);
  return Number(result[0].insertId);
}

export async function updateIndicator(id: number, values: Partial<InsertIndicator>) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  await db.update(indicators).set(values).where(eq(indicators.id, id));
}

export async function deleteIndicator(id: number) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  await db.delete(indicators).where(eq(indicators.id, id));
}

export async function listObservations(filters?: { indicatorIds?: number[]; yearFrom?: number; yearTo?: number; status?: "draft" | "reviewed" | "approved" | "rejected" }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [
    filters?.indicatorIds?.length ? inArray(indicatorObservations.indicatorId, filters.indicatorIds) : undefined,
    filters?.yearFrom ? gte(indicatorObservations.year, filters.yearFrom) : undefined,
    filters?.yearTo ? lte(indicatorObservations.year, filters.yearTo) : undefined,
    filters?.status ? eq(indicatorObservations.verificationStatus, filters.status) : undefined,
  ].filter(Boolean);
  const query = db
    .select({ observation: indicatorObservations, indicator: indicators })
    .from(indicatorObservations)
    .innerJoin(indicators, eq(indicatorObservations.indicatorId, indicators.id));
  return conditions.length > 0
    ? query.where(and(...conditions)).orderBy(desc(indicatorObservations.year), asc(indicatorObservations.quarter))
    : query.orderBy(desc(indicatorObservations.year), asc(indicatorObservations.quarter));
}

export async function getApprovedAnnualObservations(indicatorId: number) {
  const observations = await listObservations({ indicatorIds: [indicatorId], status: "approved" });
  return observations
    .filter((row) => row.observation.period === "annual")
    .map((row) => ({ year: row.observation.year, value: Number(row.observation.value), indicator: row.indicator }))
    .filter((row) => Number.isFinite(row.value))
    .sort((a, b) => a.year - b.year);
}

export async function upsertObservation(values: InsertIndicatorObservation) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  await db.insert(indicatorObservations).values(values).onDuplicateKeyUpdate({
    set: {
      value: values.value,
      targetValue: values.targetValue,
      source: values.source,
      notes: values.notes,
      enteredBy: values.enteredBy,
      verificationStatus: values.verificationStatus,
    },
  });
}

export async function deleteObservation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  await db.delete(indicatorObservations).where(eq(indicatorObservations.id, id));
}

export async function changeObservationStatus(id: number, status: "draft" | "reviewed" | "approved" | "rejected", verifiedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  await db.update(indicatorObservations).set({
    verificationStatus: status,
    verifiedBy,
    verifiedAt: status === "approved" || status === "rejected" ? new Date() : null,
  }).where(eq(indicatorObservations.id, id));
}

export async function createImportJob(values: {
  fileName: string;
  fileType: "Excel" | "CSV";
  status: "validating" | "completed" | "completed_with_errors" | "failed";
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  submittedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  const result = await db.insert(importJobs).values(values);
  return Number(result[0].insertId);
}

export async function createImportIssues(jobId: number, issues: { rowNumber: number; field?: string; message: string; severity: "error" | "warning" }[]) {
  const db = await getDb();
  if (!db || issues.length === 0) return;
  await db.insert(importIssues).values(issues.map((issue) => ({ ...issue, importJobId: jobId })));
}

export async function listImportJobs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(importJobs).orderBy(desc(importJobs.createdAt)).limit(20);
}

export async function getDashboardData(filters?: { year?: number; axis?: "اقتصادي" | "اجتماعي" | "بيئي"; framework?: "UNWTO" | "SDG" }) {
  const allIndicators = await listIndicators({ axis: filters?.axis, framework: filters?.framework });
  const observations = await listObservations({ indicatorIds: allIndicators.map((indicator) => indicator.id) });
  const approved = observations.filter((row) => row.observation.verificationStatus === "approved");
  const availableYears = Array.from(new Set(approved.map((row) => row.observation.year))).sort((a, b) => b - a);
  const scopedApproved = filters?.year ? approved.filter((row) => row.observation.year === filters.year) : approved;
  const latestYear = scopedApproved.reduce((maximum, row) => Math.max(maximum, row.observation.year), 0);
  const latest = scopedApproved.filter((row) => row.observation.year === latestYear && row.observation.period === "annual");
  const axisDistribution = (["اقتصادي", "اجتماعي", "بيئي"] as const).map((axis) => ({
    axis,
    count: allIndicators.filter((indicator) => indicator.axis === axis).length,
  }));
  const trendByYear = Array.from(new Set(scopedApproved.map((row) => row.observation.year))).sort().map((year) => ({
    year,
    observations: scopedApproved.filter((row) => row.observation.year === year && row.observation.period === "annual").length,
  }));
  const targetPerformance = buildTargetPerformance(scopedApproved);

  return {
    summary: {
      totalIndicators: allIndicators.length,
      publishedIndicators: allIndicators.filter((indicator) => indicator.status === "published").length,
      approvedObservations: scopedApproved.length,
      latestYear: latestYear || null,
      indicatorsWithTargets: targetPerformance.length,
      achievedTargets: targetPerformance.filter((item) => item.status === "achieved").length,
    },
    axisDistribution,
    trendByYear,
    latest,
    recent: (filters?.year ? observations.filter((row) => row.observation.year === filters.year) : observations).slice(0, 8),
    availableYears,
    targetPerformance,
  };
}
