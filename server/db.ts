import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
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
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { buildTargetPerformance } from "./dashboardMetrics";
import { summarizeHistoricalArchive } from "./historicalArchive";
import { historicalOfficialPublisher, historicalSourceRegistry } from "./historicalSourceRegistry";
import { buildCityRankings } from "../shared/cityRankings";
import { buildCityTrendSeries } from "../shared/cityTrends";

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

  const [areas, publishedIndicators, rawObservations] = await Promise.all([
    db.select().from(spatialAreas).where(eq(spatialAreas.status, "active")).orderBy(asc(spatialAreas.type), asc(spatialAreas.name)),
    listIndicators({ status: "published" }),
    db.select({ observation: spatialObservations, indicator: indicators, area: spatialAreas })
      .from(spatialObservations)
      .innerJoin(indicators, eq(spatialObservations.indicatorId, indicators.id))
      .innerJoin(spatialAreas, eq(spatialObservations.spatialAreaId, spatialAreas.id)),
  ]);

  const areaById = new Map(areas.map((area) => [area.id, area]));
  const approved = rawObservations
    .filter((row) => row.observation.verificationStatus === "approved")
    .filter((row) => row.observation.period === "annual" && row.observation.quarter === "annual")
    .filter((row) => !filters?.year || row.observation.year === filters.year)
    .filter((row) => !filters?.indicatorId || row.indicator.id === filters.indicatorId)
    .filter((row) => !filters?.areaId || row.area.id === filters.areaId);

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

export async function moveSpatialObservationStatus(id: number, status: "reviewed" | "approved" | "rejected", actedBy: number, note?: string) {
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
    coverageByYear,
    axisCoverageByYear,
    latest,
    recent: (filters?.year ? approved.filter((row) => row.observation.year === filters.year) : approved).slice(0, 8),
    availableYears,
    targetPerformance,
  };
}
