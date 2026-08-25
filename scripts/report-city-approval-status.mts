import { and, count, eq, inArray } from "drizzle-orm";
import { indicators, spatialObservationReviewEvents, spatialObservations } from "../drizzle/schema";
import { getApprovedAnnualCityHistory, getDb } from "../server/db";
import { calculateAnnualForecast } from "../server/forecast";

const db = await getDb();
if (!db) throw new Error("قاعدة البيانات غير متاحة.");

const scope = and(
  inArray(spatialObservations.year, [2019, 2020, 2021]),
  eq(spatialObservations.period, "annual"),
  eq(spatialObservations.quarter, "annual"),
);

const [measurements, auditEvents] = await Promise.all([
  db.select({ year: spatialObservations.year, indicatorCode: indicators.code, status: spatialObservations.verificationStatus, measurements: count(spatialObservations.id) })
    .from(spatialObservations)
    .innerJoin(indicators, eq(indicators.id, spatialObservations.indicatorId))
    .where(scope)
    .groupBy(spatialObservations.year, indicators.code, spatialObservations.verificationStatus),
  db.select({ toStatus: spatialObservationReviewEvents.toStatus, events: count(spatialObservationReviewEvents.id) })
    .from(spatialObservationReviewEvents)
    .innerJoin(spatialObservations, eq(spatialObservations.id, spatialObservationReviewEvents.spatialObservationId))
    .innerJoin(indicators, eq(indicators.id, spatialObservations.indicatorId))
    .where(scope)
    .groupBy(spatialObservationReviewEvents.toStatus),
]);

const approvedRows = await db.select({ areaId: spatialObservations.spatialAreaId, indicatorId: spatialObservations.indicatorId, year: spatialObservations.year })
  .from(spatialObservations)
  .innerJoin(indicators, eq(indicators.id, spatialObservations.indicatorId))
  .where(and(scope, eq(spatialObservations.verificationStatus, "approved")));
const seriesByCityIndicator = new Map<string, { areaId: number; indicatorId: number; years: number[] }>();
for (const row of approvedRows) {
  const key = `${row.areaId}:${row.indicatorId}`;
  const series = seriesByCityIndicator.get(key) ?? { areaId: row.areaId, indicatorId: row.indicatorId, years: [] };
  series.years.push(row.year);
  seriesByCityIndicator.set(key, series);
}
const forecastCandidates = [] as { city: string; indicator: string; years: number[]; annualGrowthRate: number }[];
const skippedForecasts = [] as { city: string; indicator: string; years: number[]; reason: string }[];
for (const series of seriesByCityIndicator.values()) {
  if (new Set(series.years).size < 2) continue;
  const history = await getApprovedAnnualCityHistory(series.areaId, series.indicatorId);
  const years = [...new Set(series.years)].sort();
  try {
    const forecast = calculateAnnualForecast({ history: history.history, horizon: 1, method: "historical_cagr" });
    forecastCandidates.push({ city: history.area.name, indicator: history.indicator.name, years, annualGrowthRate: forecast.annualGrowthRate });
  } catch (error) {
    skippedForecasts.push({ city: history.area.name, indicator: history.indicator.name, years, reason: error instanceof Error ? error.message : "سلسلة غير مؤهلة للتنبؤ." });
  }
}

const approvedGuides = await db.select({ areaId: spatialObservations.spatialAreaId, indicatorId: spatialObservations.indicatorId })
  .from(spatialObservations)
  .innerJoin(indicators, eq(indicators.id, spatialObservations.indicatorId))
  .where(and(
    inArray(spatialObservations.year, [2009, 2010]),
    eq(spatialObservations.period, "annual"),
    eq(spatialObservations.quarter, "annual"),
    eq(spatialObservations.verificationStatus, "approved"),
    eq(indicators.code, "HIST-TOURISM-GUIDES"),
  ));
const guidePairs = new Map<string, { areaId: number; indicatorId: number }>();
for (const row of approvedGuides) guidePairs.set(`${row.areaId}:${row.indicatorId}`, row);
const guideForecasts = [] as { city: string; years: number[]; annualGrowthRate: number }[];
for (const pair of guidePairs.values()) {
  const history = await getApprovedAnnualCityHistory(pair.areaId, pair.indicatorId);
  const forecast = calculateAnnualForecast({ history: history.history, horizon: 1, method: "historical_cagr" });
  guideForecasts.push({ city: history.area.name, years: history.history.map((item) => item.year), annualGrowthRate: forecast.historicalCagr });
}

console.log(JSON.stringify({ measurements, auditEvents, forecastCandidates, skippedForecasts, guideForecasts }, null, 2));
process.exit(0);
