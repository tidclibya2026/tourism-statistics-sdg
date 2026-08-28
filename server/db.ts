import { and, asc, desc, eq, gte, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  administrativeAccessEvents,
  administrativeMembers,
  dependencyReviewRuns,
  dependencyReviewSchedules,
  documentAuditEvents,
  helpContentRatings,
  type InsertIndicator,
  type InsertIndicatorObservation,
  type InsertSpatialArea,
  type InsertSpatialObservation,
  type InsertUser,
  importIssues,
  importJobs,
  indicatorObservations,
  indicators,
  publicationDestinations,
  spatialAreas,
  spatialObservationReviewEvents,
  spatialObservations,
  supportRequestAttachments,
  supportRequestReplies,
  supportRequests,
  supportNotifications,
  userPreferences,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { buildTargetPerformance } from "./dashboardMetrics";
import { summarizeHistoricalArchive } from "./historicalArchive";
import { historicalOfficialPublisher, historicalSourceRegistry } from "./historicalSourceRegistry";
import { buildCityRankings } from "../shared/cityRankings";
import { buildCityTrendSeries } from "../shared/cityTrends";
import { officialCityAccommodation2013Source, officialCityAccommodation2013Year } from "../shared/officialCityAccommodationBatch";
import { officialCityGuides2009to2010IndicatorCode, officialCityGuides2009to2010Sources, officialCityGuides2009to2010Years } from "../shared/officialCityGuides2009to2010Batch";
import { buildPublicationShowcaseAnalytics } from "../shared/publicationShowcase";
import { logOperationalEvent, safeErrorMetadata } from "./_core/observability";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      logOperationalEvent("warn", "database_client_initialization_failed", safeErrorMetadata(error));
      _db = null;
    }
  }
  return _db;
}

export type DocumentAuditAction = "document_download" | "documentation_zip_export" | "report_signed" | "pki_signature_attempt";
export type DocumentAuditOutcome = "success" | "denied" | "failed";

export async function recordDocumentAuditEvent(values: { actorUserId?: number | null; action: DocumentAuditAction; outcome: DocumentAuditOutcome; resource: string; details?: string | null }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(documentAuditEvents).values({ actorUserId: values.actorUserId ?? null, action: values.action, outcome: values.outcome, resource: values.resource, details: values.details ?? null });
}

export async function listDocumentAuditEvents(limit = 200) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: documentAuditEvents.id, actorUserId: documentAuditEvents.actorUserId, action: documentAuditEvents.action, outcome: documentAuditEvents.outcome, resource: documentAuditEvents.resource, details: documentAuditEvents.details, createdAt: documentAuditEvents.createdAt, actorName: users.name, actorEmail: users.email }).from(documentAuditEvents).leftJoin(users, eq(documentAuditEvents.actorUserId, users.id)).orderBy(desc(documentAuditEvents.createdAt)).limit(Math.min(Math.max(limit, 1), 500));
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

export async function getAdministrativeMemberByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(administrativeMembers).where(eq(administrativeMembers.userId, userId)).limit(1);
  return result[0];
}

export async function hasAdministrativeCapability(userId: number, capability: "canManageRoles" | "canApproveReleases" | "canReviewSecurity") {
  const member = await getAdministrativeMemberByUserId(userId);
  return Boolean(member && member.status === "active" && member[capability] === 1);
}

export async function getAdministrativeAccessOverview() {
  const db = await getDb();
  if (!db) return { members: [], events: [] };
  const [members, events] = await Promise.all([
    db.select({ member: administrativeMembers, user: users }).from(administrativeMembers).innerJoin(users, eq(administrativeMembers.userId, users.id)).orderBy(asc(users.name)),
    db.select({ event: administrativeAccessEvents, target: users }).from(administrativeAccessEvents).innerJoin(users, eq(administrativeAccessEvents.targetUserId, users.id)).orderBy(desc(administrativeAccessEvents.actedAt)).limit(30),
  ]);
  return { members, events };
}

export async function upsertAdministrativeMember(values: { userId: number; status: "active" | "suspended"; canManageRoles: boolean; canApproveReleases: boolean; canReviewSecurity: boolean }, actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  await db.transaction(async (tx) => {
    const existing = (await tx.select().from(administrativeMembers).where(eq(administrativeMembers.userId, values.userId)).limit(1))[0];
    await tx.insert(administrativeMembers).values({
      userId: values.userId,
      status: values.status,
      canManageRoles: values.canManageRoles ? 1 : 0,
      canApproveReleases: values.canApproveReleases ? 1 : 0,
      canReviewSecurity: values.canReviewSecurity ? 1 : 0,
      grantedBy: actorUserId,
    }).onDuplicateKeyUpdate({ set: {
      status: values.status,
      canManageRoles: values.canManageRoles ? 1 : 0,
      canApproveReleases: values.canApproveReleases ? 1 : 0,
      canReviewSecurity: values.canReviewSecurity ? 1 : 0,
      grantedBy: actorUserId,
    } });
    const action = !existing ? "member_granted" : values.status === "suspended" ? "member_suspended" : "member_updated";
    await tx.insert(administrativeAccessEvents).values({
      targetUserId: values.userId,
      actorUserId,
      action,
      detail: `roles=${values.canManageRoles ? "1" : "0"},release=${values.canApproveReleases ? "1" : "0"},security=${values.canReviewSecurity ? "1" : "0"}`,
    });
  });
}

export async function updateUserRole(id: number, role: "admin" | "analyst" | "viewer", actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  await db.transaction(async (tx) => {
    await tx.update(users).set({ role }).where(eq(users.id, id));
    await tx.insert(administrativeAccessEvents).values({ targetUserId: id, actorUserId, action: "role_updated", detail: `role=${role}` });
  });
}

export async function listDependencyReviewRuns(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dependencyReviewRuns).orderBy(desc(dependencyReviewRuns.startedAt)).limit(Math.min(Math.max(limit, 1), 50));
}

export async function recordDependencyReviewRun(values: {
  trigger: "manual" | "scheduled";
  status: "completed" | "failed";
  criticalCount: number;
  highCount: number;
  moderateCount: number;
  lowCount: number;
  summary: string;
  errorMessage?: string | null;
  initiatedBy?: number | null;
  startedAt: Date;
  completedAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  const result = await db.insert(dependencyReviewRuns).values({
    ...values,
    summary: values.summary.slice(0, 5000),
    errorMessage: values.errorMessage?.slice(0, 1000) ?? null,
  });
  return Number(result[0].insertId);
}

export async function getDependencyReviewScheduleByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(dependencyReviewSchedules).where(eq(dependencyReviewSchedules.scheduleCronTaskUid, taskUid)).limit(1);
  return result[0];
}

/** Claims a short execution window so platform retries cannot produce duplicate reports. */
export async function claimDependencyReviewScheduleRun(taskUid: string, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  const retryWindowStart = new Date(now.getTime() - 10 * 60 * 1000);
  const result = await db.update(dependencyReviewSchedules).set({ lastRunAt: now }).where(and(
    eq(dependencyReviewSchedules.scheduleCronTaskUid, taskUid),
    eq(dependencyReviewSchedules.environment, "staging"),
    eq(dependencyReviewSchedules.enabled, 1),
    or(isNull(dependencyReviewSchedules.lastRunAt), lt(dependencyReviewSchedules.lastRunAt, retryWindowStart)),
  ));
  return Number((result as unknown as [{ affectedRows?: number }])[0]?.affectedRows ?? 0) === 1;
}

export async function listIndicators(filters?: { axis?: "اقتصادي" | "اجتماعي" | "بيئي"; framework?: "UNWTO" | "SDG"; sdgReference?: "SDG 8" | "SDG 11" | "SDG 12" | "SDG 14" | "SDG 17"; status?: "draft" | "published" | "archived" }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [
    filters?.axis ? eq(indicators.axis, filters.axis) : undefined,
    filters?.framework ? eq(indicators.framework, filters.framework) : undefined,
    filters?.sdgReference ? eq(indicators.sdgReference, filters.sdgReference) : undefined,
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

export async function getHistoricalArchiveData() {
  const historicalIndicators = (await listIndicators()).filter((indicator) => indicator.code.startsWith("HIST-"));
  const observations = await listObservations({ indicatorIds: historicalIndicators.map((indicator) => indicator.id) });
  const summary = summarizeHistoricalArchive(observations);
  return {
    ...summary,
    officialPublisher: historicalOfficialPublisher,
    sourceRegistry: historicalSourceRegistry,
    indicators: historicalIndicators,
    observations: observations
      .filter((row) => row.observation.period === "annual" && row.observation.quarter === "annual")
      .map((row) => ({
        indicatorId: row.indicator.id,
        indicatorCode: row.indicator.code,
        indicatorName: row.indicator.name,
        unit: row.indicator.unit,
        axis: row.indicator.axis,
        framework: row.indicator.framework,
        sdgReference: row.indicator.sdgReference,
        year: row.observation.year,
        value: Number(row.observation.value),
        verificationStatus: row.observation.verificationStatus,
        source: row.observation.source,
      }))
      .sort((a, b) => a.year - b.year || a.indicatorName.localeCompare(b.indicatorName, "ar")),
  };
}

type SpatialFilters = {
  year?: number;
  indicatorId?: number;
  areaId?: number;
};

export async function getSpatialOverview(filters?: SpatialFilters) {
  const db = await getDb();
  if (!db) {
    return {
      summary: { regions: 0, cities: 0, approvedObservations: 0, latestYear: null as number | null },
      regions: [],
      cities: [],
      indicators: [],
      observations: [],
      availableYears: [],
    };
  }

  const observationConditions = [
    eq(spatialObservations.verificationStatus, "approved"),
    eq(spatialObservations.period, "annual"),
    eq(spatialObservations.quarter, "annual"),
    filters?.year ? eq(spatialObservations.year, filters.year) : undefined,
    filters?.indicatorId ? eq(spatialObservations.indicatorId, filters.indicatorId) : undefined,
    filters?.areaId ? eq(spatialObservations.spatialAreaId, filters.areaId) : undefined,
  ].filter(Boolean);
  const [areas, publishedIndicators, approved] = await Promise.all([
    db.select().from(spatialAreas).where(eq(spatialAreas.status, "active")).orderBy(asc(spatialAreas.type), asc(spatialAreas.name)),
    listIndicators({ status: "published" }),
    db.select({ observation: spatialObservations, indicator: indicators, area: spatialAreas })
      .from(spatialObservations)
      .innerJoin(indicators, eq(spatialObservations.indicatorId, indicators.id))
      .innerJoin(spatialAreas, eq(spatialObservations.spatialAreaId, spatialAreas.id))
      .where(and(...observationConditions)),
  ]);

  const areaById = new Map(areas.map((area) => [area.id, area]));

  const regions = areas.filter((area) => area.type === "region");
  const cities = areas
    .filter((area) => area.type === "city")
    .map((city) => ({ ...city, parentName: city.parentId ? areaById.get(city.parentId)?.name ?? null : null }));
  const availableYears = Array.from(new Set(approved.map((row) => row.observation.year))).sort((a, b) => b - a);

  return {
    summary: {
      regions: regions.length,
      cities: cities.length,
      approvedObservations: approved.length,
      latestYear: availableYears[0] ?? null,
    },
    regions,
    cities,
    indicators: publishedIndicators,
    observations: approved
      .map((row) => ({
        id: row.observation.id,
        areaId: row.area.id,
        areaCode: row.area.code,
        areaName: row.area.name,
        areaType: row.area.type,
        parentName: row.area.parentId ? areaById.get(row.area.parentId)?.name ?? null : null,
        indicatorId: row.indicator.id,
        indicatorCode: row.indicator.code,
        indicatorName: row.indicator.name,
        unit: row.indicator.unit,
        year: row.observation.year,
        value: Number(row.observation.value),
        source: row.observation.source,
      }))
      .sort((a, b) => b.year - a.year || a.areaName.localeCompare(b.areaName, "ar")),
    availableYears,
  };
}

export async function getSpatialAreaDetail(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [area] = await db.select().from(spatialAreas).where(and(eq(spatialAreas.id, id), eq(spatialAreas.status, "active"))).limit(1);
  if (!area || area.type !== "city") return undefined;
  const areas = await db.select().from(spatialAreas).where(eq(spatialAreas.status, "active"));
  const areaById = new Map(areas.map((item) => [item.id, item]));
  const children = areas.filter((item) => item.parentId === area.id);
  const linkedAreaIds = [area.id, ...children.map((item) => item.id)];
  const rows = await db.select({ observation: spatialObservations, indicator: indicators, spatialArea: spatialAreas })
    .from(spatialObservations)
    .innerJoin(indicators, eq(spatialObservations.indicatorId, indicators.id))
    .innerJoin(spatialAreas, eq(spatialObservations.spatialAreaId, spatialAreas.id));
  const observations = rows
    .filter((row) => linkedAreaIds.includes(row.spatialArea.id))
    .filter((row) => row.observation.verificationStatus === "approved" && row.observation.period === "annual" && row.observation.quarter === "annual")
    .map((row) => ({
      id: row.observation.id,
      areaId: row.spatialArea.id,
      areaName: row.spatialArea.name,
      parentName: row.spatialArea.parentId ? areaById.get(row.spatialArea.parentId)?.name ?? null : null,
      indicatorName: row.indicator.name,
      indicatorCode: row.indicator.code,
      unit: row.indicator.unit,
      year: row.observation.year,
      value: Number(row.observation.value),
      source: row.observation.source,
      notes: row.observation.notes,
    }))
    .sort((a, b) => b.year - a.year || a.indicatorName.localeCompare(b.indicatorName, "ar"));
  const latest = observations[0] ?? null;
  return {
    area: { ...area, parentName: area.parentId ? areaById.get(area.parentId)?.name ?? null : null },
    children: children.map((item) => ({ id: item.id, code: item.code, name: item.name, type: item.type })),
    observations,
    summary: { approvedObservations: observations.length, latestYear: latest?.year ?? null, latestValue: latest?.value ?? null, latestUnit: latest?.unit ?? null, latestIndicatorName: latest?.indicatorName ?? null },
  };
}

export async function getCityRankings() {
  const overview = await getSpatialOverview();
  return buildCityRankings(
    overview.cities.map((city) => ({ id: city.id, name: city.name, code: city.code })),
    overview.indicators.map((indicator) => ({ id: indicator.id, code: indicator.code, name: indicator.name, unit: indicator.unit })),
    overview.observations.map((row) => ({ areaId: row.areaId, areaType: row.areaType, indicatorId: row.indicatorId, year: row.year, value: row.value })),
  );
}

export async function getCityTrend(categoryId: string) {
  const overview = await getSpatialOverview();
  const rankings = buildCityRankings(
    overview.cities.map((city) => ({ id: city.id, name: city.name, code: city.code })),
    overview.indicators.map((indicator) => ({ id: indicator.id, code: indicator.code, name: indicator.name, unit: indicator.unit })),
    overview.observations.map((row) => ({ areaId: row.areaId, areaType: row.areaType, indicatorId: row.indicatorId, year: row.year, value: row.value })),
  );
  const category = rankings.find((item) => item.id === categoryId);
  if (!category) throw new Error("فئة ترتيب المدن غير معرفة.");
  if (!category.indicator) return { category, years: [], series: [] };
  const relevant = overview.observations.filter((row) => row.areaType === "city" && row.indicatorId === category.indicator!.id);
  const trend = buildCityTrendSeries(overview.cities.map((city) => ({ id: city.id, name: city.name })), relevant.map((row) => ({ areaId: row.areaId, areaType: row.areaType, year: row.year, value: row.value, unit: row.unit })));
  return { category: { id: category.id, label: category.label, description: category.description, indicator: category.indicator, unit: category.unit }, ...trend };
}

export async function getApprovedAnnualCityHistory(areaId: number, indicatorId: number) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  const [area, indicator, rows] = await Promise.all([
    getSpatialAreaById(areaId),
    getIndicatorById(indicatorId),
    db.select().from(spatialObservations).where(and(eq(spatialObservations.spatialAreaId, areaId), eq(spatialObservations.indicatorId, indicatorId))),
  ]);
  if (!area || area.status !== "active" || area.type !== "city") throw new Error("المدينة المختارة غير متاحة للتنبؤ.");
  if (!indicator) throw new Error("المؤشر المختار غير موجود.");
  const history = rows
    .filter((row) => row.verificationStatus === "approved" && row.period === "annual" && row.quarter === "annual")
    .map((row) => ({ year: row.year, value: Number(row.value) }))
    .filter((row) => Number.isFinite(row.value))
    .sort((a, b) => a.year - b.year);
  return { area, indicator, history };
}

export async function getSpatialManagementData() {
  const db = await getDb();
  if (!db) return { areas: [], indicators: [], observations: [] };
  const [areas, publishedIndicators, observations, reviewEvents] = await Promise.all([
    db.select().from(spatialAreas).orderBy(asc(spatialAreas.type), asc(spatialAreas.name)),
    listIndicators({ status: "published" }),
    db.select({ observation: spatialObservations, indicator: indicators, area: spatialAreas })
      .from(spatialObservations)
      .innerJoin(indicators, eq(spatialObservations.indicatorId, indicators.id))
      .innerJoin(spatialAreas, eq(spatialObservations.spatialAreaId, spatialAreas.id))
      .orderBy(desc(spatialObservations.year), desc(spatialObservations.updatedAt)),
    db.select({ event: spatialObservationReviewEvents, actor: users })
      .from(spatialObservationReviewEvents)
      .leftJoin(users, eq(spatialObservationReviewEvents.actedBy, users.id))
      .orderBy(desc(spatialObservationReviewEvents.actedAt)),
  ]);
  const areaById = new Map(areas.map((area) => [area.id, area]));
  const eventsByObservation = new Map<number, { id: number; fromStatus: "draft" | "reviewed" | "approved" | "rejected" | null; toStatus: "draft" | "reviewed" | "approved" | "rejected"; note: string | null; actedAt: Date; actorName: string | null }[]>();
  reviewEvents.forEach(({ event, actor }) => {
    const history = eventsByObservation.get(event.spatialObservationId) ?? [];
    history.push({ id: event.id, fromStatus: event.fromStatus, toStatus: event.toStatus, note: event.note, actedAt: event.actedAt, actorName: actor?.name ?? null });
    eventsByObservation.set(event.spatialObservationId, history);
  });
  return {
    areas: areas.map((area) => ({ ...area, parentName: area.parentId ? areaById.get(area.parentId)?.name ?? null : null })),
    indicators: publishedIndicators,
    observations: observations.map((row) => ({
      ...row.observation,
      value: Number(row.observation.value),
      targetValue: row.observation.targetValue === null ? null : Number(row.observation.targetValue),
      areaName: row.area.name,
      indicatorName: row.indicator.name,
      unit: row.indicator.unit,
      indicatorCode: row.indicator.code,
      reviewHistory: eventsByObservation.get(row.observation.id) ?? [],
    })),
  };
}

export async function getSpatialEntryOptions() {
  const db = await getDb();
  if (!db) return { cities: [], indicators: [] };
  const [cities, publishedIndicators] = await Promise.all([
    db.select({ id: spatialAreas.id, code: spatialAreas.code, name: spatialAreas.name }).from(spatialAreas).where(and(eq(spatialAreas.type, "city"), eq(spatialAreas.status, "active"))).orderBy(asc(spatialAreas.name)),
    db.select({ id: indicators.id, code: indicators.code, name: indicators.name, unit: indicators.unit }).from(indicators).where(eq(indicators.status, "published")).orderBy(asc(indicators.name)),
  ]);
  return { cities, indicators: publishedIndicators };
}

export async function createSpatialArea(values: InsertSpatialArea) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  const result = await db.insert(spatialAreas).values(values);
  return Number(result[0].insertId);
}

export async function getSpatialAreaById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(spatialAreas).where(eq(spatialAreas.id, id)).limit(1);
  return result[0];
}

export async function getSpatialAreasByCodes(codes: string[]) {
  const db = await getDb();
  if (!db || codes.length === 0) return [];
  return db.select().from(spatialAreas).where(inArray(spatialAreas.code, codes));
}

export async function updateSpatialArea(id: number, values: Partial<InsertSpatialArea>) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  await db.update(spatialAreas).set(values).where(eq(spatialAreas.id, id));
}

export async function upsertSpatialObservation(values: InsertSpatialObservation) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  const quarter = values.quarter ?? "annual";
  const existing = await db.select().from(spatialObservations).where(and(
    eq(spatialObservations.spatialAreaId, values.spatialAreaId),
    eq(spatialObservations.indicatorId, values.indicatorId),
    eq(spatialObservations.year, values.year),
    eq(spatialObservations.period, values.period),
    eq(spatialObservations.quarter, quarter),
  )).limit(1);
  await db.insert(spatialObservations).values(values).onDuplicateKeyUpdate({
    set: {
      value: values.value,
      targetValue: values.targetValue,
      source: values.source,
      notes: values.notes,
      verificationStatus: values.verificationStatus,
      verifiedBy: null,
      verifiedAt: null,
    },
  });
  const stored = await db.select().from(spatialObservations).where(and(
    eq(spatialObservations.spatialAreaId, values.spatialAreaId),
    eq(spatialObservations.indicatorId, values.indicatorId),
    eq(spatialObservations.year, values.year),
    eq(spatialObservations.period, values.period),
    eq(spatialObservations.quarter, quarter),
  )).limit(1);
  const observation = stored[0];
  if (!observation) throw new Error("تعذر إيجاد القياس المكاني بعد الحفظ.");
  await db.insert(spatialObservationReviewEvents).values({
    spatialObservationId: observation.id,
    fromStatus: existing[0]?.verificationStatus ?? null,
    toStatus: "draft",
    note: existing[0] ? "تم تحديث القياس من قبل مُدخله وإعادته إلى المسودة للمراجعة المستقلة." : "تم إنشاء القياس كمسودة بانتظار المراجعة.",
    actedBy: values.enteredBy ?? null,
  });
  return observation.id;
}

export async function getSpatialObservationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(spatialObservations).where(eq(spatialObservations.id, id)).limit(1);
  return result[0];
}

export async function getSpatialObservationsByIds(ids: number[]) {
  const db = await getDb();
  if (!db || ids.length === 0) return [];
  return db.select().from(spatialObservations).where(inArray(spatialObservations.id, ids));
}

export async function getSpatialObservationForPeriod(values: Pick<InsertSpatialObservation, "spatialAreaId" | "indicatorId" | "year" | "period" | "quarter">) {
  const db = await getDb();
  if (!db) return undefined;
  const quarter = values.quarter ?? "annual";
  const result = await db.select().from(spatialObservations).where(and(
    eq(spatialObservations.spatialAreaId, values.spatialAreaId),
    eq(spatialObservations.indicatorId, values.indicatorId),
    eq(spatialObservations.year, values.year),
    eq(spatialObservations.period, values.period),
    eq(spatialObservations.quarter, quarter),
  )).limit(1);
  return result[0];
}

export async function moveSpatialObservationStatus(id: number, status: "draft" | "reviewed" | "approved" | "rejected", actedBy: number, note?: string) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  const current = await getSpatialObservationById(id);
  if (!current) throw new Error("القياس المكاني غير موجود.");
  await db.update(spatialObservations).set({
    verificationStatus: status,
    verifiedBy: status === "approved" || status === "rejected" ? actedBy : null,
    verifiedAt: status === "approved" || status === "rejected" ? new Date() : null,
  }).where(eq(spatialObservations.id, id));
  await db.insert(spatialObservationReviewEvents).values({
    spatialObservationId: id,
    fromStatus: current.verificationStatus,
    toStatus: status,
    note: note ?? null,
    actedBy,
  });
}

export async function moveSpatialObservationStatuses(ids: number[], status: "reviewed" | "approved", actedBy: number, note?: string) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  if (ids.length === 0) return 0;
  const current = await getSpatialObservationsByIds(ids);
  if (current.length !== ids.length) throw new Error("تعذر إيجاد جميع القياسات المحددة.");
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(spatialObservations).set({
      verificationStatus: status,
      verifiedBy: status === "approved" ? actedBy : null,
      verifiedAt: status === "approved" ? now : null,
    }).where(inArray(spatialObservations.id, ids));
    await tx.insert(spatialObservationReviewEvents).values(current.map((observation) => ({
      spatialObservationId: observation.id,
      fromStatus: observation.verificationStatus,
      toStatus: status,
      note: note ?? null,
      actedBy,
    })));
  });
  return current.length;
}

export async function reviewOfficialCityAccommodation2013Batch(actedBy: number, note?: string) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  const candidates = await db.select().from(spatialObservations).where(and(
    eq(spatialObservations.source, officialCityAccommodation2013Source),
    eq(spatialObservations.year, officialCityAccommodation2013Year),
    eq(spatialObservations.period, "annual"),
    eq(spatialObservations.quarter, "annual"),
    eq(spatialObservations.verificationStatus, "draft"),
  ));
  const reviewable = candidates.filter((observation) => observation.enteredBy !== actedBy);
  const auditNote = `مراجعة مستقلة لدفعة مرافق الإيواء العاملة حسب المدن لسنة 2013.${note ? ` ${note}` : ""}`;
  await db.transaction(async (tx) => {
    for (const observation of reviewable) {
      await tx.update(spatialObservations).set({ verificationStatus: "reviewed", verifiedBy: null, verifiedAt: null }).where(eq(spatialObservations.id, observation.id));
      await tx.insert(spatialObservationReviewEvents).values({ spatialObservationId: observation.id, fromStatus: "draft", toStatus: "reviewed", note: auditNote, actedBy });
    }
  });
  return { identified: candidates.length, reviewed: reviewable.length, skippedSelfEntered: candidates.length - reviewable.length };
}

export async function approveOfficialCityAccommodation2013Batch(actedBy: number, note?: string) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  const candidates = await db.select().from(spatialObservations).where(and(
    eq(spatialObservations.source, officialCityAccommodation2013Source),
    eq(spatialObservations.year, officialCityAccommodation2013Year),
    eq(spatialObservations.period, "annual"),
    eq(spatialObservations.quarter, "annual"),
    eq(spatialObservations.verificationStatus, "reviewed"),
  ));
  const auditNote = `اعتماد مسؤول لدفعة مرافق الإيواء العاملة حسب المدن لسنة 2013.${note ? ` ${note}` : ""}`;
  const approvedAt = new Date();
  await db.transaction(async (tx) => {
    for (const observation of candidates) {
      await tx.update(spatialObservations).set({ verificationStatus: "approved", verifiedBy: actedBy, verifiedAt: approvedAt }).where(eq(spatialObservations.id, observation.id));
      await tx.insert(spatialObservationReviewEvents).values({ spatialObservationId: observation.id, fromStatus: "reviewed", toStatus: "approved", note: auditNote, actedBy });
    }
  });
  return { identified: candidates.length, approved: candidates.length };
}

async function getOfficialCityGuides2009to2010Candidates(status: "draft" | "reviewed") {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  const [indicator] = await getIndicatorsByCodes([officialCityGuides2009to2010IndicatorCode]);
  if (!indicator) return [];
  const candidates = await db.select().from(spatialObservations).where(and(
    eq(spatialObservations.indicatorId, indicator.id),
    inArray(spatialObservations.year, [...officialCityGuides2009to2010Years]),
    eq(spatialObservations.period, "annual"),
    eq(spatialObservations.quarter, "annual"),
    eq(spatialObservations.verificationStatus, status),
  ));
  return candidates.filter((observation) => officialCityGuides2009to2010Sources.some((source) => source === observation.source));
}

export async function reviewOfficialCityGuides2009to2010Batch(actedBy: number, note?: string) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  const candidates = await getOfficialCityGuides2009to2010Candidates("draft");
  const reviewable = candidates.filter((observation) => observation.enteredBy !== actedBy);
  const auditNote = `مراجعة مستقلة لدفعة المرشدين السياحيين حسب المدن لسنتي 2009–2010.${note ? ` ${note}` : ""}`;
  await db.transaction(async (tx) => {
    for (const observation of reviewable) {
      await tx.update(spatialObservations).set({ verificationStatus: "reviewed", verifiedBy: null, verifiedAt: null }).where(eq(spatialObservations.id, observation.id));
      await tx.insert(spatialObservationReviewEvents).values({ spatialObservationId: observation.id, fromStatus: "draft", toStatus: "reviewed", note: auditNote, actedBy });
    }
  });
  return { identified: candidates.length, reviewed: reviewable.length, skippedSelfEntered: candidates.length - reviewable.length };
}

export async function approveOfficialCityGuides2009to2010Batch(actedBy: number, note?: string) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  const candidates = await getOfficialCityGuides2009to2010Candidates("reviewed");
  const auditNote = `اعتماد مسؤول لدفعة المرشدين السياحيين حسب المدن لسنتي 2009–2010.${note ? ` ${note}` : ""}`;
  const approvedAt = new Date();
  await db.transaction(async (tx) => {
    for (const observation of candidates) {
      await tx.update(spatialObservations).set({ verificationStatus: "approved", verifiedBy: actedBy, verifiedAt: approvedAt }).where(eq(spatialObservations.id, observation.id));
      await tx.insert(spatialObservationReviewEvents).values({ spatialObservationId: observation.id, fromStatus: "reviewed", toStatus: "approved", note: auditNote, actedBy });
    }
  });
  return { identified: candidates.length, approved: candidates.length };
}

export async function deleteSpatialObservation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  await db.delete(spatialObservations).where(eq(spatialObservations.id, id));
}

export async function listPublicationDestinations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(publicationDestinations).orderBy(asc(publicationDestinations.name));
}

export async function getPublicationHubData() {
  const [destinations, spatial, national] = await Promise.all([
    listPublicationDestinations(),
    getSpatialOverview(),
    listObservations({ status: "approved" }),
  ]);
  const annualNational = national.filter((row) => row.observation.period === "annual" && row.observation.quarter === "annual");
  const latestYear = annualNational.reduce((latest, row) => Math.max(latest, row.observation.year), 0);
  return {
    destinations,
    summary: {
      nationalApproved: annualNational.length,
      spatialApproved: spatial.summary.approvedObservations,
      activeSpatialAreas: spatial.summary.regions + spatial.summary.cities,
      latestYear: latestYear || null,
    },
    contract: {
      version: "v1",
      status: "إعداد داخلي",
      access: "تعاقدي بعد تحديد عنوان الاستقبال وصلاحيات التكامل لكل منصة",
      fields: ["indicator_code", "indicator_name", "year", "period", "value", "unit", "area_code", "area_name", "source", "verification_status"],
      qualityRule: "لا تشمل الحزمة إلا القياسات المعتمدة؛ وتبقى البيانات المكانية فارغة حتى اعتماد قياسات منسوبة إلى منطقة أو مدينة.",
    },
  };
}

export async function getPublicationShowcaseData() {
  const [hub, spatial] = await Promise.all([getPublicationHubData(), getSpatialOverview()]);
  return {
    ...hub,
    analytics: buildPublicationShowcaseAnalytics(spatial.observations),
  };
}

export async function getPublicationFeed(destinationCode: "visit_libya" | "libya_atlas") {
  const destination = (await listPublicationDestinations()).find((item) => item.code === destinationCode);
  if (!destination) throw new Error("وجهة النشر غير معرفة.");

  if (destination.status !== "ready") {
    return {
      version: "v1",
      ready: false,
      destination: { code: destination.code, name: destination.name, status: destination.status },
      records: [],
      message: "لم تُجهز هذه الوجهة بعد للربط الخارجي.",
    };
  }

  const [national, spatial] = await Promise.all([
    listObservations({ status: "approved" }),
    getSpatialOverview(),
  ]);
  const nationalRecords = national
    .filter((row) => row.observation.period === "annual" && row.observation.quarter === "annual")
    .map((row) => ({
      indicator_code: row.indicator.code,
      indicator_name: row.indicator.name,
      year: row.observation.year,
      period: row.observation.period,
      value: Number(row.observation.value),
      unit: row.indicator.unit,
      area_code: null,
      area_name: null,
      source: row.observation.source,
      verification_status: row.observation.verificationStatus,
    }));
  const spatialRecords = spatial.observations.map((row) => ({
    indicator_code: row.indicatorCode,
    indicator_name: row.indicatorName,
    year: row.year,
    period: "annual" as const,
    value: row.value,
    unit: row.unit,
    area_code: row.areaCode,
    area_name: row.areaName,
    source: row.source,
    verification_status: "approved" as const,
  }));

  return {
    version: "v1",
    ready: true,
    destination: { code: destination.code, name: destination.name, status: destination.status },
    records: [...nationalRecords, ...spatialRecords],
    message: "حزمة موحدة من القياسات المعتمدة فقط.",
  };
}

export async function updatePublicationDestinationStatus(id: number, status: "draft" | "ready" | "paused", updatedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  await db.update(publicationDestinations).set({ status, updatedBy }).where(eq(publicationDestinations.id, id));
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

export async function getObservationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(indicatorObservations).where(eq(indicatorObservations.id, id)).limit(1);
  return result[0];
}

export async function getObservationForPeriod(values: Pick<InsertIndicatorObservation, "indicatorId" | "year" | "period" | "quarter">) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(indicatorObservations).where(and(
    eq(indicatorObservations.indicatorId, values.indicatorId),
    eq(indicatorObservations.year, values.year),
    eq(indicatorObservations.period, values.period),
    eq(indicatorObservations.quarter, values.quarter ?? "annual"),
  )).limit(1);
  return result[0];
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

export async function getDashboardData(filters?: { year?: number; axis?: "اقتصادي" | "اجتماعي" | "بيئي"; framework?: "UNWTO" | "SDG"; sdgReference?: "SDG 8" | "SDG 11" | "SDG 12" | "SDG 14" | "SDG 17" }) {
  const allIndicators = await listIndicators({ axis: filters?.axis, framework: filters?.framework, sdgReference: filters?.sdgReference });
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
  const coverageByYear = Array.from(new Set(scopedApproved.map((row) => row.observation.year))).sort().map((year) => ({
    year,
    indicators: new Set(scopedApproved.filter((row) => row.observation.year === year && row.observation.period === "annual").map((row) => row.observation.indicatorId)).size,
  }));
  const axisCoverageByYear = Array.from(new Set(scopedApproved.map((row) => row.observation.year))).sort().map((year) => ({
    year,
    اقتصادي: scopedApproved.filter((row) => row.observation.year === year && row.observation.period === "annual" && row.indicator.axis === "اقتصادي").length,
    اجتماعي: scopedApproved.filter((row) => row.observation.year === year && row.observation.period === "annual" && row.indicator.axis === "اجتماعي").length,
    بيئي: scopedApproved.filter((row) => row.observation.year === year && row.observation.period === "annual" && row.indicator.axis === "بيئي").length,
  }));
  const targetPerformance = buildTargetPerformance(scopedApproved);
  const indicatorGrowth = allIndicators.map((indicator) => {
    const series = scopedApproved.filter((row) => row.observation.indicatorId === indicator.id && row.observation.period === "annual").sort((left, right) => left.observation.year - right.observation.year);
    const first = series[0];
    const last = series.at(-1);
    const firstValue = first ? Number(first.observation.value) : Number.NaN;
    const lastValue = last ? Number(last.observation.value) : Number.NaN;
    const growthPercent = first && last && series.length > 1 && Number.isFinite(firstValue) && Number.isFinite(lastValue) && firstValue !== 0 ? ((lastValue - firstValue) / Math.abs(firstValue)) * 100 : null;
    return growthPercent === null || !first || !last ? null : { indicatorId: indicator.id, name: indicator.name, unit: indicator.unit, firstYear: first.observation.year, lastYear: last.observation.year, growthPercent };
  }).filter((item): item is NonNullable<typeof item> => item !== null).sort((left, right) => right.growthPercent - left.growthPercent).slice(0, 5);

  return {
    summary: {
      totalIndicators: allIndicators.length,
      publishedIndicators: allIndicators.filter((indicator) => indicator.status === "published").length,
      approvedObservations: scopedApproved.length,
      latestYear: latestYear || null,
      indicatorsWithTargets: targetPerformance.length,
      achievedTargets: targetPerformance.filter((item) => item.status === "achieved").length,
    },
    indicators: allIndicators.map((indicator) => ({ id: indicator.id, name: indicator.name, unit: indicator.unit })),
    axisDistribution,
    trendByYear,
    coverageByYear,
    axisCoverageByYear,
    latest,
    recent: (filters?.year ? approved.filter((row) => row.observation.year === filters.year) : approved).slice(0, 8),
    availableYears,
    targetPerformance,
    indicatorGrowth,
  };
}

export async function createSupportRequest(input: {
  userId: number;
  roleSnapshot: "admin" | "analyst" | "viewer";
  category: "question" | "issue" | "suggestion";
  subject: string;
  message: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  const result = await db.insert(supportRequests).values(input);
  return { id: Number(result[0].insertId), status: "open" as const };
}

export async function listMySupportRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(supportRequests).where(eq(supportRequests.userId, userId)).orderBy(desc(supportRequests.createdAt)).limit(12);
  return hydrateSupportRequests(rows);
}

export async function listSupportRequests() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: supportRequests.id,
    roleSnapshot: supportRequests.roleSnapshot,
    category: supportRequests.category,
    subject: supportRequests.subject,
    message: supportRequests.message,
    status: supportRequests.status,
    createdAt: supportRequests.createdAt,
    updatedAt: supportRequests.updatedAt,
    submitterName: users.name,
    submitterEmail: users.email,
  }).from(supportRequests).leftJoin(users, eq(supportRequests.userId, users.id)).orderBy(desc(supportRequests.createdAt)).limit(100);
  return hydrateSupportRequests(rows);
}

async function hydrateSupportRequests<T extends { id: number }>(rows: T[]) {
  const db = await getDb();
  if (!db || rows.length === 0) return rows.map((row) => ({ ...row, attachments: [], replies: [] }));
  const requestIds = rows.map((row) => row.id);
  const [attachments, replies] = await Promise.all([
    db.select().from(supportRequestAttachments).where(inArray(supportRequestAttachments.supportRequestId, requestIds)).orderBy(asc(supportRequestAttachments.createdAt)),
    db.select({
      id: supportRequestReplies.id,
      supportRequestId: supportRequestReplies.supportRequestId,
      message: supportRequestReplies.message,
      createdAt: supportRequestReplies.createdAt,
      authorName: users.name,
    }).from(supportRequestReplies).leftJoin(users, eq(supportRequestReplies.authorUserId, users.id)).where(inArray(supportRequestReplies.supportRequestId, requestIds)).orderBy(asc(supportRequestReplies.createdAt)),
  ]);
  return rows.map((row) => ({
    ...row,
    attachments: attachments.filter((item) => item.supportRequestId === row.id),
    replies: replies.filter((item) => item.supportRequestId === row.id),
  }));
}

export async function createSupportRequestReply(input: { supportRequestId: number; authorUserId: number; message: string }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  const request = await getSupportRequestOwner(input.supportRequestId);
  if (!request) throw new Error("طلب الدعم غير موجود.");
  const result = await db.insert(supportRequestReplies).values(input);
  await db.update(supportRequests).set({ status: "in_progress" }).where(eq(supportRequests.id, input.supportRequestId));
  const preferences = await getUserPreferences(request.userId);
  if (preferences.notifySupportReplies) {
    await db.insert(supportNotifications).values({
      userId: request.userId,
      supportRequestId: input.supportRequestId,
      type: "reply",
      title: "رد جديد من إدارة الدعم",
      message: `وصل رد جديد بخصوص طلب الدعم: ${request.subject}`.slice(0, 600),
    });
  }
  return { id: Number(result[0].insertId) };
}

export async function getSupportRequestOwner(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select({ id: supportRequests.id, userId: supportRequests.userId, subject: supportRequests.subject, status: supportRequests.status })
    .from(supportRequests).where(eq(supportRequests.id, id)).limit(1);
  return rows[0];
}

export async function countSupportRequestAttachments(supportRequestId: number) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ count: sql<number>`count(*)` }).from(supportRequestAttachments)
    .where(eq(supportRequestAttachments.supportRequestId, supportRequestId));
  return Number(rows[0]?.count ?? 0);
}

export async function createSupportRequestAttachment(input: {
  supportRequestId: number;
  uploadedBy: number;
  fileName: string;
  mimeType: string;
  byteSize: number;
  storageKey: string;
  storageUrl: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  const result = await db.insert(supportRequestAttachments).values(input);
  return { id: Number(result[0].insertId), url: input.storageUrl };
}

export async function updateSupportRequestStatus(id: number, status: "open" | "in_progress" | "resolved" | "closed") {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  const request = await getSupportRequestOwner(id);
  if (!request) throw new Error("طلب الدعم غير موجود.");
  await db.update(supportRequests).set({ status }).where(eq(supportRequests.id, id));
  const labels = { open: "جديدة", in_progress: "قيد المتابعة", resolved: "تم الحل", closed: "أغلقت" };
  const preferences = await getUserPreferences(request.userId);
  if (preferences.notifySupportStatus) {
    await db.insert(supportNotifications).values({
      userId: request.userId,
      supportRequestId: id,
      type: "status",
      title: "تحديث حالة طلب الدعم",
      message: `أصبحت حالة طلب «${request.subject}»: ${labels[status]}`.slice(0, 600),
    });
  }
  return { success: true };
}

export async function createSupportNotification(input: { userId: number; supportRequestId: number; type: "reply" | "status" | "escalation"; title: string; message: string }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  const result = await db.insert(supportNotifications).values(input);
  return { id: Number(result[0].insertId) };
}

export async function listSupportNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supportNotifications).where(eq(supportNotifications.userId, userId)).orderBy(desc(supportNotifications.createdAt)).limit(20);
}

export async function markSupportNotificationsRead(userId: number, ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  await db.update(supportNotifications).set({ readAt: new Date() }).where(and(eq(supportNotifications.userId, userId), inArray(supportNotifications.id, ids)));
  return { success: true };
}

export async function getUserPreferences(userId: number) {
  const db = await getDb();
  const defaults = { notifySupportReplies: true, notifySupportStatus: true };
  if (!db) return defaults;
  const rows = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  const preference = rows[0];
  return preference ? { notifySupportReplies: preference.notifySupportReplies === 1, notifySupportStatus: preference.notifySupportStatus === 1 } : defaults;
}

export async function updateUserPreferences(userId: number, input: { notifySupportReplies: boolean; notifySupportStatus: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  await db.insert(userPreferences).values({ userId, notifySupportReplies: input.notifySupportReplies ? 1 : 0, notifySupportStatus: input.notifySupportStatus ? 1 : 0 })
    .onDuplicateKeyUpdate({ set: { notifySupportReplies: input.notifySupportReplies ? 1 : 0, notifySupportStatus: input.notifySupportStatus ? 1 : 0, updatedAt: new Date() } });
  return getUserPreferences(userId);
}

export async function updateUserDisplayName(userId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  await db.update(users).set({ name }).where(eq(users.id, userId));
  return { success: true, name };
}

export async function upsertHelpContentRating(input: { userId: number; sectionId: string; rating: "helpful" | "not_helpful" }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة.");
  await db.insert(helpContentRatings).values(input).onDuplicateKeyUpdate({ set: { rating: input.rating, updatedAt: new Date() } });
  return { success: true };
}

export async function getMyHelpContentRatings(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ sectionId: helpContentRatings.sectionId, rating: helpContentRatings.rating })
    .from(helpContentRatings).where(eq(helpContentRatings.userId, userId));
}

export async function getHelpContentRatingSummary() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    sectionId: helpContentRatings.sectionId,
    role: users.role,
    helpful: sql<number>`sum(case when ${helpContentRatings.rating} = 'helpful' then 1 else 0 end)`,
    notHelpful: sql<number>`sum(case when ${helpContentRatings.rating} = 'not_helpful' then 1 else 0 end)`,
  }).from(helpContentRatings).leftJoin(users, eq(helpContentRatings.userId, users.id)).groupBy(helpContentRatings.sectionId, users.role);
  return rows.map((row) => ({ ...row, role: row.role ?? "viewer", helpful: Number(row.helpful), notHelpful: Number(row.notHelpful) }));
}
