import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { validateImportedObservations } from "./validation";
import { calculateAnnualForecast } from "./forecast";
import { validateUnitValues } from "../shared/unitValidation";
import { invokeLLM } from "./_core/llm";
import { buildDashboardNarrativePrompt, dashboardNarrativeSystemPrompt } from "./dashboardNarrative";

const axisSchema = z.enum(["اقتصادي", "اجتماعي", "بيئي"]);
const frameworkSchema = z.enum(["UNWTO", "SDG"]);
const sdgSchema = z.enum(["SDG 8", "SDG 11", "SDG 12", "SDG 14", "SDG 17"]);
const statusSchema = z.enum(["draft", "published", "archived"]);
const verificationSchema = z.enum(["draft", "reviewed", "approved", "rejected"]);
const roleSchema = z.enum(["admin", "analyst", "viewer"]);
const publicationStatusSchema = z.enum(["draft", "ready", "paused"]);
const spatialAreaTypeSchema = z.enum(["region", "city"]);
const boundaryStatusSchema = z.enum(["not_provided", "submitted", "verified"]);

const spatialAreaInput = z.object({
  code: z.string().trim().min(2).max(64),
  name: z.string().trim().min(2).max(255),
  type: spatialAreaTypeSchema,
  parentId: z.number().int().positive().nullable().optional(),
  geographicSource: z.string().trim().max(500).nullable().optional(),
  boundaryReferenceTitle: z.string().trim().max(255).nullable().optional(),
  boundaryReferenceUrl: z.string().trim().url().max(500).nullable().optional(),
  boundaryStatus: boundaryStatusSchema.default("not_provided"),
  status: z.enum(["active", "archived"]).default("active"),
}).superRefine((value, context) => {
  if (value.boundaryStatus !== "not_provided" && (!value.boundaryReferenceTitle || !value.boundaryReferenceUrl)) {
    context.addIssue({ code: "custom", path: ["boundaryReferenceUrl"], message: "يتطلب توثيق الحدود اسم المرجع ورابطه الرسمي." });
  }
});

const spatialObservationInput = z.object({
  spatialAreaId: z.number().int().positive(),
  indicatorId: z.number().int().positive(),
  year: z.number().int().min(1990).max(2100),
  period: z.enum(["annual", "quarterly"]),
  quarter: z.enum(["annual", "Q1", "Q2", "Q3", "Q4"]),
  value: z.number().finite(),
  targetValue: z.number().finite().nullable().optional(),
  source: z.string().trim().min(3).max(500),
  notes: z.string().trim().max(4000).optional(),
});

const analystProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "analyst") {
    throw new TRPCError({ code: "FORBIDDEN", message: "صلاحياتك لا تسمح بإدخال أو مراجعة البيانات." });
  }
  return next({ ctx });
});

const indicatorInput = z.object({
  code: z.string().trim().min(2).max(64),
  name: z.string().trim().min(3).max(255),
  description: z.string().trim().max(4000).optional(),
  axis: axisSchema,
  framework: frameworkSchema,
  sdgReference: sdgSchema.optional().nullable(),
  unit: z.string().trim().min(1).max(128),
  calculationMethod: z.string().trim().max(4000).optional(),
  officialSource: z.string().trim().max(255).optional(),
  status: statusSchema,
});

const observationInput = z.object({
  indicatorId: z.number().int().positive(),
  year: z.number().int().min(2000).max(2100),
  period: z.enum(["annual", "quarterly"]),
  quarter: z.enum(["annual", "Q1", "Q2", "Q3", "Q4"]),
  value: z.number().finite(),
  targetValue: z.number().finite().optional().nullable(),
  source: z.string().trim().max(255).optional(),
  notes: z.string().trim().max(4000).optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: protectedProcedure.query((opts) => opts.ctx.user),
    logout: protectedProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  dashboard: router({
    summary: protectedProcedure.input(z.object({
      year: z.number().int().min(2000).max(2100).optional(),
      axis: axisSchema.optional(),
      framework: frameworkSchema.optional(),
      sdgReference: sdgSchema.optional(),
    }).optional()).query(({ input }) => db.getDashboardData(input)),
    narrative: protectedProcedure.input(z.object({
      year: z.number().int().min(2000).max(2100).optional(),
      axis: axisSchema.optional(),
      framework: frameworkSchema.optional(),
      sdgReference: sdgSchema.optional(),
    }).optional()).mutation(async ({ input }) => {
      const data = await db.getDashboardData(input);
      if (data.summary.approvedObservations === 0) {
        return { text: "## لا توجد بيانات معتمدة كافية\n\nلا يمكن توليد تقرير تحليلي قبل اعتماد قياسات للمؤشرات ضمن نطاق الفلاتر الحالي." };
      }
      const response = await invokeLLM({
        model: "gpt-5-mini",
        maxTokens: 900,
        messages: [
          { role: "system", content: dashboardNarrativeSystemPrompt },
          { role: "user", content: buildDashboardNarrativePrompt(data, input ?? {}) },
        ],
      });
      const content = response.choices[0]?.message?.content;
      const text = typeof content === "string" ? content.trim() : "";
      if (!text) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر توليد التقرير النصي في الوقت الحالي." });
      return { text };
    }),
  }),
  indicators: router({
    list: protectedProcedure.input(z.object({ axis: axisSchema.optional(), framework: frameworkSchema.optional(), sdgReference: sdgSchema.optional(), status: statusSchema.optional() }).optional()).query(({ input }) => db.listIndicators(input)),
    create: adminProcedure.input(indicatorInput).mutation(({ ctx, input }) => db.createIndicator({ ...input, createdBy: ctx.user.id })),
    update: adminProcedure.input(indicatorInput.partial().extend({ id: z.number().int().positive() })).mutation(({ input }) => {
      const { id, ...values } = input;
      return db.updateIndicator(id, values);
    }),
    delete: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => db.deleteIndicator(input.id)),
  }),
  observations: router({
    list: protectedProcedure.input(z.object({ indicatorIds: z.array(z.number().int().positive()).optional(), yearFrom: z.number().int().optional(), yearTo: z.number().int().optional(), status: verificationSchema.optional() }).optional()).query(({ input }) => db.listObservations(input)),
    upsert: analystProcedure.input(observationInput).mutation(async ({ ctx, input }) => {
      if (input.period === "annual" && input.quarter !== "annual") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "البيانات السنوية يجب أن تستخدم الفترة annual." });
      }
      if (input.period === "quarterly" && input.quarter === "annual") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "البيانات الربع سنوية تتطلب تحديد الربع." });
      }
      const indicator = await db.getIndicatorById(input.indicatorId);
      if (!indicator) throw new TRPCError({ code: "NOT_FOUND", message: "المؤشر المختار غير موجود." });
      const unitErrors = validateUnitValues(indicator.unit, input.value, input.targetValue);
      if (unitErrors.length) throw new TRPCError({ code: "BAD_REQUEST", message: unitErrors[0] });
      return db.upsertObservation({ ...input, value: String(input.value), targetValue: input.targetValue === null ? null : input.targetValue === undefined ? undefined : String(input.targetValue), enteredBy: ctx.user.id, verificationStatus: "draft" });
    }),
    setStatus: analystProcedure.input(z.object({ id: z.number().int().positive(), status: verificationSchema })).mutation(({ ctx, input }) => db.changeObservationStatus(input.id, input.status, ctx.user.id)),
    delete: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => db.deleteObservation(input.id)),
  }),
  forecast: router({
    calculate: protectedProcedure.input(z.object({
      indicatorId: z.number().int().positive(),
      horizon: z.number().int().min(1).max(15).default(5),
      method: z.enum(["historical_cagr", "custom_rate"]).default("historical_cagr"),
      customRate: z.number().finite().min(-0.99).max(2).optional(),
    }).superRefine((value, context) => {
      if (value.method === "custom_rate" && value.customRate === undefined) {
        context.addIssue({ code: "custom", path: ["customRate"], message: "يتطلب المعدل المخصص إدخال نسبة نمو." });
      }
    })).query(async ({ input }) => {
      const history = await db.getApprovedAnnualObservations(input.indicatorId);
      try {
        const result = calculateAnnualForecast({ history, horizon: input.horizon, method: input.method, customRate: input.customRate });
        return { ...result, indicator: history[0]?.indicator ?? null };
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "تعذر حساب التنبؤ." });
      }
    }),
  }),
  historical: router({
    overview: protectedProcedure.query(() => db.getHistoricalArchiveData()),
  }),
  spatial: router({
    overview: protectedProcedure.input(z.object({
      year: z.number().int().min(1990).max(2100).optional(),
      indicatorId: z.number().int().positive().optional(),
      areaId: z.number().int().positive().optional(),
    }).optional()).query(({ input }) => db.getSpatialOverview(input)),
    detail: protectedProcedure.input(z.object({ areaId: z.number().int().positive() })).query(async ({ input }) => {
      const detail = await db.getSpatialAreaDetail(input.areaId);
      if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "الموقع المكاني غير موجود أو غير نشط." });
      return detail;
    }),
    cityRankings: protectedProcedure.query(() => db.getCityRankings()),
    cityTrend: protectedProcedure.input(z.object({ categoryId: z.string().trim().min(1).max(64) })).query(async ({ input }) => {
      try {
        return await db.getCityTrend(input.categoryId);
      } catch (error) {
        throw new TRPCError({ code: "NOT_FOUND", message: error instanceof Error ? error.message : "تعذر تحميل السلسلة الزمنية للمدن." });
      }
    }),
    cityForecast: protectedProcedure.input(z.object({
      areaId: z.number().int().positive(),
      indicatorId: z.number().int().positive(),
      horizon: z.number().int().min(1).max(15).default(5),
      method: z.enum(["historical_cagr", "custom_rate"]).default("historical_cagr"),
      customRate: z.number().finite().min(-0.99).max(2).optional(),
    }).superRefine((value, context) => {
      if (value.method === "custom_rate" && value.customRate === undefined) {
        context.addIssue({ code: "custom", path: ["customRate"], message: "يتطلب المعدل المخصص إدخال نسبة نمو." });
      }
    })).query(async ({ input }) => {
      try {
        const { area, indicator, history } = await db.getApprovedAnnualCityHistory(input.areaId, input.indicatorId);
        return { ...calculateAnnualForecast({ history, horizon: input.horizon, method: input.method, customRate: input.customRate }), area, indicator };
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "تعذر حساب تنبؤ المدينة." });
      }
    }),
    management: analystProcedure.query(() => db.getSpatialManagementData()),
    createArea: adminProcedure.input(spatialAreaInput).mutation(async ({ ctx, input }) => {
      if (input.parentId) {
        const parent = await db.getSpatialAreaById(input.parentId);
        if (!parent || parent.type !== "region") throw new TRPCError({ code: "BAD_REQUEST", message: "يجب أن ترتبط المدينة بإقليم موجود." });
      }
      return db.createSpatialArea({
        ...input,
        parentId: input.parentId ?? null,
        geographicSource: input.geographicSource ?? null,
        boundaryReferenceTitle: input.boundaryReferenceTitle ?? null,
        boundaryReferenceUrl: input.boundaryReferenceUrl ?? null,
        boundaryVerifiedBy: input.boundaryStatus === "verified" ? ctx.user.id : null,
        boundaryVerifiedAt: input.boundaryStatus === "verified" ? new Date() : null,
      });
    }),
    updateArea: adminProcedure.input(spatialAreaInput.partial().extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const { id, boundaryStatus, ...values } = input;
      if (values.parentId) {
        const parent = await db.getSpatialAreaById(values.parentId);
        if (!parent || parent.type !== "region") throw new TRPCError({ code: "BAD_REQUEST", message: "يجب أن ترتبط المدينة بإقليم موجود." });
      }
      const updateValues = {
        ...values,
        ...(boundaryStatus ? {
          boundaryStatus,
          boundaryVerifiedBy: boundaryStatus === "verified" ? ctx.user.id : null,
          boundaryVerifiedAt: boundaryStatus === "verified" ? new Date() : null,
        } : {}),
      };
      return db.updateSpatialArea(id, updateValues);
    }),
    upsertObservation: analystProcedure.input(spatialObservationInput).mutation(async ({ ctx, input }) => {
      if (input.period === "annual" && input.quarter !== "annual") throw new TRPCError({ code: "BAD_REQUEST", message: "القياس السنوي يتطلب الفترة annual." });
      if (input.period === "quarterly" && input.quarter === "annual") throw new TRPCError({ code: "BAD_REQUEST", message: "القياس الربع سنوي يتطلب تحديد الربع." });
      const [area, indicator] = await Promise.all([db.getSpatialAreaById(input.spatialAreaId), db.getIndicatorById(input.indicatorId)]);
      if (!area || area.status !== "active") throw new TRPCError({ code: "NOT_FOUND", message: "الموقع المكاني المختار غير متاح." });
      if (!indicator) throw new TRPCError({ code: "NOT_FOUND", message: "المؤشر المختار غير موجود." });
      const unitErrors = validateUnitValues(indicator.unit, input.value, input.targetValue);
      if (unitErrors.length) throw new TRPCError({ code: "BAD_REQUEST", message: unitErrors[0] });
      const existing = await db.getSpatialObservationForPeriod(input);
      if (existing && existing.enteredBy !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكن تعديل قياس منسوب إلى مستخدم آخر. أكمل المراجعة المستقلة أو ارفض السجل مع ملاحظة للمُدخل." });
      }
      return db.upsertSpatialObservation({ ...input, value: String(input.value), targetValue: input.targetValue === null ? null : input.targetValue === undefined ? undefined : String(input.targetValue), enteredBy: ctx.user.id, verificationStatus: "draft" });
    }),
    setObservationStatus: analystProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["reviewed", "approved", "rejected"]), note: z.string().trim().max(2000).optional() })).mutation(async ({ ctx, input }) => {
      const observation = await db.getSpatialObservationById(input.id);
      if (!observation) throw new TRPCError({ code: "NOT_FOUND", message: "القياس المكاني غير موجود." });
      if (input.status === "reviewed") {
        if (observation.verificationStatus !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن إرسال القياس إلى المراجعة إلا من حالة المسودة." });
        if (observation.enteredBy === ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "يلزم أن يراجع القياس محلل مستقل عن مُدخله." });
      }
      if (input.status === "approved") {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "اعتماد القياسات للنشر محصور بدور المسؤول." });
        if (observation.verificationStatus !== "reviewed") throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن الاعتماد قبل إتمام مرحلة المراجعة." });
      }
      if (input.status === "rejected" && ctx.user.role !== "admin" && observation.enteredBy === ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكن رفض قياسك الشخصي دون مراجع مستقل." });
      return db.moveSpatialObservationStatus(input.id, input.status, ctx.user.id, input.note);
    }),
    reviewOfficialCityAccommodation2013Batch: analystProcedure.input(z.object({ confirmed: z.literal(true), note: z.string().trim().max(2000).optional() })).mutation(({ ctx, input }) =>
      db.reviewOfficialCityAccommodation2013Batch(ctx.user.id, input.note)),
    deleteObservation: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => db.deleteSpatialObservation(input.id)),
  }),
  publication: router({
    hub: protectedProcedure.query(() => db.getPublicationHubData()),
    feed: publicProcedure.input(z.object({ destination: z.enum(["visit_libya", "libya_atlas"]) })).query(async ({ input }) => {
      try {
        return await db.getPublicationFeed(input.destination);
      } catch (error) {
        throw new TRPCError({ code: "NOT_FOUND", message: error instanceof Error ? error.message : "تعذر تحميل حزمة النشر." });
      }
    }),
    updateStatus: adminProcedure.input(z.object({ id: z.number().int().positive(), status: publicationStatusSchema })).mutation(({ ctx, input }) =>
      db.updatePublicationDestinationStatus(input.id, input.status, ctx.user.id)),
  }),
  imports: router({
    history: protectedProcedure.query(() => db.listImportJobs()),
    process: analystProcedure.input(z.object({
      fileName: z.string().trim().min(1).max(255),
      fileType: z.enum(["Excel", "CSV"]),
      rows: z.array(z.record(z.string(), z.unknown())).min(1).max(2000),
    })).mutation(async ({ ctx, input }) => {
      const candidateCodes = Array.from(new Set(input.rows.map((row) => String(row.code ?? "").trim()).filter(Boolean)));
      const knownIndicators = await db.getIndicatorsByCodes(candidateCodes);
      const validation = validateImportedObservations(input.rows, new Set(knownIndicators.map((indicator) => indicator.code)));
      const jobId = await db.createImportJob({
        fileName: input.fileName,
        fileType: input.fileType,
        status: validation.issues.length ? "completed_with_errors" : "completed",
        totalRows: input.rows.length,
        acceptedRows: validation.accepted.length,
        rejectedRows: input.rows.length - validation.accepted.length,
        submittedBy: ctx.user.id,
      });
      await db.createImportIssues(jobId, validation.issues);
      const indicatorMap = new Map(knownIndicators.map((indicator) => [indicator.code, indicator.id]));
      for (const row of validation.accepted) {
        await db.upsertObservation({
          indicatorId: indicatorMap.get(row.code)!,
          year: row.year,
          period: row.period,
          quarter: row.quarter,
          value: String(row.value),
          targetValue: row.targetValue === undefined ? undefined : String(row.targetValue),
          source: row.source,
          notes: row.notes,
          enteredBy: ctx.user.id,
          verificationStatus: "draft",
        });
      }
      return { jobId, acceptedRows: validation.accepted.length, rejectedRows: input.rows.length - validation.accepted.length, issues: validation.issues };
    }),
  }),
  users: router({
    list: adminProcedure.query(() => db.listUsers()),
    updateRole: adminProcedure.input(z.object({ id: z.number().int().positive(), role: roleSchema })).mutation(({ ctx, input }) => {
      if (ctx.user.id === input.id && input.role !== "admin") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن للمسؤول إلغاء دور admin الخاص به من هذه الصفحة." });
      }
      return db.updateUserRole(input.id, input.role);
    }),
  }),
});

export type AppRouter = typeof appRouter;
