import { TRPCError } from "@trpc/server";
import { createReportSignature, getPkiIntegrationStatus } from "./reportSignature";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, ownerProcedure, protectedProcedure, publicProcedure, releaseApprovalProcedure, roleManagementProcedure, router, securityReviewProcedure } from "./_core/trpc";
import * as db from "./db";
import { runDependencyReview } from "./dependencyReview";
import { validateImportedObservations } from "./validation";
import { validateImportedCityStatistics } from "../shared/cityStatisticsImport";
import { calculateAnnualForecast } from "./forecast";
import { validateUnitValues } from "../shared/unitValidation";
import { invokeLLM } from "./_core/llm";
import { buildDashboardNarrativePrompt, dashboardNarrativeSystemPrompt } from "./dashboardNarrative";
import { answerHelpQuestion } from "./helpChatbot";
import { answerDataQuestion } from "./dataAssistant";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";

const axisSchema = z.enum(["اقتصادي", "اجتماعي", "بيئي"]);
const frameworkSchema = z.enum(["UNWTO", "SDG"]);
const sdgSchema = z.enum(["SDG 8", "SDG 11", "SDG 12", "SDG 14", "SDG 17"]);
const statusSchema = z.enum(["draft", "published", "archived"]);
const verificationSchema = z.enum(["draft", "reviewed", "approved", "rejected"]);
const roleSchema = z.enum(["admin", "analyst", "viewer"]);
const publicationStatusSchema = z.enum(["draft", "ready", "paused"]);
const spatialAreaTypeSchema = z.enum(["region", "city"]);
const boundaryStatusSchema = z.enum(["not_provided", "submitted", "verified"]);
const supportAttachmentTypes = ["image/png", "image/jpeg", "application/pdf", "text/plain"] as const;

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
    viewer: publicProcedure.query((opts) => opts.ctx.user),
    administrativeCapabilities: protectedProcedure.query(async ({ ctx }) => {
      const isOwner = Boolean(ENV.ownerOpenId) && ctx.user.openId === ENV.ownerOpenId;
      const isAdmin = ctx.user.role === "admin";
      return {
        canManageRoles: isAdmin && (isOwner || await db.hasAdministrativeCapability(ctx.user.id, "canManageRoles")),
        canApproveReleases: isAdmin && (isOwner || await db.hasAdministrativeCapability(ctx.user.id, "canApproveReleases")),
        canReviewSecurity: isAdmin && (isOwner || await db.hasAdministrativeCapability(ctx.user.id, "canReviewSecurity")),
      };
    }),
    logout: protectedProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  profile: router({
    preferences: protectedProcedure.query(({ ctx }) => db.getUserPreferences(ctx.user.id)),
    updatePreferences: protectedProcedure.input(z.object({ notifySupportReplies: z.boolean(), notifySupportStatus: z.boolean() })).mutation(({ ctx, input }) => db.updateUserPreferences(ctx.user.id, input)),
    updateDisplayName: protectedProcedure.input(z.object({ name: z.string().trim().min(2, "الاسم الظاهر قصير جداً.").max(120) })).mutation(({ ctx, input }) => db.updateUserDisplayName(ctx.user.id, input.name)),
  }),
  assistant: router({
    data: protectedProcedure.input(z.object({
      question: z.string().trim().min(2, "اكتب سؤالاً لا يقل عن حرفين.").max(1200),
      history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1800) })).max(6).default([]),
      axis: z.enum(["اقتصادي", "اجتماعي", "بيئي", "سياحي"]).optional(),
      scope: z.enum(["all", "national", "spatial", "forecast"]).optional(),
    })).mutation(({ input }) => answerDataQuestion(input)),
  }),
  documentAudit: router({
    pkiStatus: securityReviewProcedure.query(() => getPkiIntegrationStatus()),
    record: protectedProcedure.input(z.object({ action: z.enum(["document_download", "documentation_zip_export"]), outcome: z.enum(["success", "failed"]), resource: z.string().trim().min(1).max(255), details: z.string().max(2000).optional() })).mutation(async ({ ctx, input }) => {
      await db.recordDocumentAuditEvent({ actorUserId: ctx.user.id, ...input });
      return { success: true } as const;
    }),
    list: adminProcedure.input(z.object({ limit: z.number().int().positive().max(500).optional() }).optional()).query(({ input }) => db.listDocumentAuditEvents(input?.limit ?? 200)),
  }),
  dashboard: router({
    signApprovedReport: protectedProcedure.input(z.object({ reportType: z.enum(["approved-observations", "approved-statistics"]), title: z.string().trim().min(1).max(200), yearFrom: z.number().int().min(1900).max(2100), yearTo: z.number().int().min(1900).max(2100), observationCount: z.number().int().nonnegative(), contentHash: z.string().trim().max(128).optional() })).mutation(async ({ ctx, input }) => {
      const isOwner = Boolean(ENV.ownerOpenId) && ctx.user.openId === ENV.ownerOpenId;
      const allowed = ctx.user.role === "admin" && (isOwner || await db.hasAdministrativeCapability(ctx.user.id, "canApproveReleases"));
      if (!allowed) throw new TRPCError({ code: "FORBIDDEN", message: "توقيع التقارير مقيد برئيس الإحصاء أو المسؤول المفوض باعتماد الإصدارات." });
      const signed = createReportSignature(input, { name: ctx.user.name ?? "رئيس الإحصاء", openId: ctx.user.openId });
      await db.recordDocumentAuditEvent({ actorUserId: ctx.user.id, action: "report_signed", outcome: "success", resource: input.title, details: JSON.stringify({ reportType: input.reportType, yearFrom: input.yearFrom, yearTo: input.yearTo, observationCount: input.observationCount, contentHash: input.contentHash ?? null, signature: signed.signature }) });
      return signed;
    }),
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
      const existing = await db.getObservationForPeriod(input);
      if (existing && (existing.verificationStatus !== "draft" || existing.enteredBy !== ctx.user.id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكن استبدال قياس قائم ما لم يكن مسودة تخص مُدخل القياس نفسه." });
      }
      return db.upsertObservation({ ...input, value: String(input.value), targetValue: input.targetValue === null ? null : input.targetValue === undefined ? undefined : String(input.targetValue), enteredBy: ctx.user.id, verificationStatus: "draft" });
    }),
    setStatus: analystProcedure.input(z.object({ id: z.number().int().positive(), status: verificationSchema })).mutation(async ({ ctx, input }) => {
      const observation = await db.getObservationById(input.id);
      if (!observation) throw new TRPCError({ code: "NOT_FOUND", message: "القياس الوطني غير موجود." });
      if (input.status === "draft") {
        if (ctx.user.role !== "admin" || observation.verificationStatus !== "rejected") throw new TRPCError({ code: "FORBIDDEN", message: "إعادة القياس إلى مسودة موثقة محصورة بالمسؤول ومن حالة مرفوض فقط." });
      }
      if (input.status === "reviewed") {
        if (observation.verificationStatus !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "تقتصر المراجعة على المسودات." });
        if (observation.enteredBy === ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "يلزم أن يراجع القياس محلل مستقل عن مُدخله." });
      }
      if (input.status === "approved") {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "اعتماد القياس للنشر محصور بدور المسؤول." });
        if (observation.verificationStatus !== "reviewed") throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن الاعتماد قبل إتمام المراجعة المستقلة." });
      }
      if (input.status === "rejected" && ctx.user.role !== "admin" && observation.enteredBy === ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكن رفض قياسك الشخصي دون مراجع مستقل." });
      return db.changeObservationStatus(input.id, input.status, ctx.user.id);
    }),
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
    overview: publicProcedure.input(z.object({
      year: z.number().int().min(1990).max(2100).optional(),
      indicatorId: z.number().int().positive().optional(),
      areaId: z.number().int().positive().optional(),
    }).optional()).query(({ input }) => db.getSpatialOverview(input)),
    detail: publicProcedure.input(z.object({ areaId: z.number().int().positive() })).query(async ({ input }) => {
      const detail = await db.getSpatialAreaDetail(input.areaId);
      if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "الموقع المكاني غير موجود أو غير نشط." });
      return detail;
    }),
    cityRankings: publicProcedure.query(() => db.getCityRankings()),
    cityTrend: publicProcedure.input(z.object({ categoryId: z.string().trim().min(1).max(64) })).query(async ({ input }) => {
      try {
        return await db.getCityTrend(input.categoryId);
      } catch (error) {
        throw new TRPCError({ code: "NOT_FOUND", message: error instanceof Error ? error.message : "تعذر تحميل السلسلة الزمنية للمدن." });
      }
    }),
    cityForecast: publicProcedure.input(z.object({
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
    entryOptions: analystProcedure.query(() => db.getSpatialEntryOptions()),
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
    setObservationStatus: analystProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["draft", "reviewed", "approved", "rejected"]), note: z.string().trim().max(2000).optional() })).mutation(async ({ ctx, input }) => {
      const observation = await db.getSpatialObservationById(input.id);
      if (!observation) throw new TRPCError({ code: "NOT_FOUND", message: "القياس المكاني غير موجود." });
      if (input.status === "draft") {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "إعادة القياس إلى مسودة موثقة محصورة بدور المسؤول." });
        if (observation.verificationStatus !== "rejected") throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن إعادة القياس إلى مسودة إلا من حالة مرفوض." });
      }
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
    bulkSetObservationStatus: analystProcedure.input(z.object({
      ids: z.array(z.number().int().positive()).min(1).max(1000).refine((ids) => new Set(ids).size === ids.length, "لا تكرر القياس نفسه في الاختيار."),
      status: z.enum(["reviewed", "approved"]),
      confirmed: z.literal(true),
      note: z.string().trim().max(2000).optional(),
    })).mutation(async ({ ctx, input }) => {
      const observations = await db.getSpatialObservationsByIds(input.ids);
      if (observations.length !== input.ids.length) throw new TRPCError({ code: "NOT_FOUND", message: "يتضمن الاختيار قياساً مكانياً غير موجود." });
      if (input.status === "reviewed") {
        if (observations.some((observation) => observation.verificationStatus !== "draft")) throw new TRPCError({ code: "BAD_REQUEST", message: "تقتصر المراجعة الجماعية على المسودات فقط." });
        if (observations.some((observation) => observation.enteredBy === ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكن أن تراجع ضمن الدفعة قياساً أدخلته بنفسك." });
      }
      if (input.status === "approved") {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "الاعتماد الجماعي للنشر محصور بدور المسؤول." });
        if (observations.some((observation) => observation.verificationStatus !== "reviewed")) throw new TRPCError({ code: "BAD_REQUEST", message: "تقتصر عملية الاعتماد الجماعية على القياسات ذات المراجعة المكتملة." });
      }
      const updated = await db.moveSpatialObservationStatuses(input.ids, input.status, ctx.user.id, input.note);
      return { updated, status: input.status };
    }),
    reviewOfficialCityAccommodation2013Batch: analystProcedure.input(z.object({ confirmed: z.literal(true), note: z.string().trim().max(2000).optional() })).mutation(({ ctx, input }) =>
      db.reviewOfficialCityAccommodation2013Batch(ctx.user.id, input.note)),
    approveOfficialCityAccommodation2013Batch: adminProcedure.input(z.object({ confirmed: z.literal(true), note: z.string().trim().max(2000).optional() })).mutation(({ ctx, input }) =>
      db.approveOfficialCityAccommodation2013Batch(ctx.user.id, input.note)),
    reviewOfficialCityGuides2009to2010Batch: analystProcedure.input(z.object({ confirmed: z.literal(true), note: z.string().trim().max(2000).optional() })).mutation(({ ctx, input }) =>
      db.reviewOfficialCityGuides2009to2010Batch(ctx.user.id, input.note)),
    approveOfficialCityGuides2009to2010Batch: adminProcedure.input(z.object({ confirmed: z.literal(true), note: z.string().trim().max(2000).optional() })).mutation(({ ctx, input }) =>
      db.approveOfficialCityGuides2009to2010Batch(ctx.user.id, input.note)),
    deleteObservation: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => db.deleteSpatialObservation(input.id)),
  }),
  publication: router({
    hub: protectedProcedure.query(() => db.getPublicationHubData()),
    showcase: publicProcedure.query(() => db.getPublicationShowcaseData()),
    feed: publicProcedure.input(z.object({ destination: z.enum(["visit_libya", "libya_atlas"]) })).query(async ({ input }) => {
      try {
        return await db.getPublicationFeed(input.destination);
      } catch (error) {
        throw new TRPCError({ code: "NOT_FOUND", message: error instanceof Error ? error.message : "تعذر تحميل حزمة النشر." });
      }
    }),
    updateStatus: releaseApprovalProcedure.input(z.object({ id: z.number().int().positive(), status: publicationStatusSchema, confirmed: z.literal(true).optional() })).mutation(({ ctx, input }) => {
      if (input.status === "ready" && input.confirmed !== true) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "يتطلب تحويل الوجهة إلى «جاهز للربط» تأكيداً صريحاً بعد معاينة الحزمة وعقد التكامل." });
      }
      return db.updatePublicationDestinationStatus(input.id, input.status, ctx.user.id);
    }),
  }),
  security: router({
    dependencyReviews: securityReviewProcedure.query(() => db.listDependencyReviewRuns()),
    runDependencyReview: securityReviewProcedure.mutation(async ({ ctx }) => {
      try {
        return await runDependencyReview({ trigger: "manual", initiatedBy: ctx.user.id });
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "تعذرت مراجعة التبعيات." });
      }
    }),
  }),
  support: router({
    submit: protectedProcedure.input(z.object({
      category: z.enum(["question", "issue", "suggestion"]),
      subject: z.string().trim().min(4, "اكتب عنواناً من أربع خانات على الأقل.").max(180),
      message: z.string().trim().min(10, "اكتب تفاصيل الاستفسار أو المشكلة.").max(5000),
    })).mutation(({ ctx, input }) => db.createSupportRequest({ ...input, userId: ctx.user.id, roleSnapshot: ctx.user.role })),
    mine: protectedProcedure.query(({ ctx }) => db.listMySupportRequests(ctx.user.id)),
    ratings: protectedProcedure.query(async ({ ctx }) => ({
      mine: await db.getMyHelpContentRatings(ctx.user.id),
      summary: await db.getHelpContentRatingSummary(),
    })),
    rate: protectedProcedure.input(z.object({
      sectionId: z.string().trim().min(1).max(80).regex(/^[a-z-]+$/),
      rating: z.enum(["helpful", "not_helpful"]),
    })).mutation(({ ctx, input }) => db.upsertHelpContentRating({ ...input, userId: ctx.user.id })),
    inbox: adminProcedure.query(async () => ({
      requests: await db.listSupportRequests(),
      ratingSummary: await db.getHelpContentRatingSummary(),
    })),
    updateStatus: adminProcedure.input(z.object({
      id: z.number().int().positive(),
      status: z.enum(["open", "in_progress", "resolved", "closed"]),
    })).mutation(({ input }) => db.updateSupportRequestStatus(input.id, input.status)),
    reply: adminProcedure.input(z.object({
      supportRequestId: z.number().int().positive(),
      message: z.string().trim().min(3).max(5000),
    })).mutation(({ ctx, input }) => db.createSupportRequestReply({ ...input, authorUserId: ctx.user.id })),
    uploadAttachment: protectedProcedure.input(z.object({
      supportRequestId: z.number().int().positive(),
      fileName: z.string().trim().min(1).max(255),
      mimeType: z.enum(supportAttachmentTypes),
      base64: z.string().min(1).max(5_600_000),
    })).mutation(async ({ ctx, input }) => {
      const request = await db.getSupportRequestOwner(input.supportRequestId);
      if (!request || request.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "يمكنك إرفاق ملف بطلب دعمك فقط." });
      if (await db.countSupportRequestAttachments(input.supportRequestId) >= 3) throw new TRPCError({ code: "BAD_REQUEST", message: "الحد الأقصى ثلاث مرفقات لكل طلب." });
      const data = Buffer.from(input.base64, "base64");
      if (!data.length || data.length > 4 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "يجب ألا يتجاوز حجم المرفق 4 ميغابايت." });
      const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "attachment";
      const stored = await storagePut(`support/${input.supportRequestId}/${ctx.user.id}-${safeName}`, data, input.mimeType);
      return db.createSupportRequestAttachment({
        supportRequestId: input.supportRequestId,
        uploadedBy: ctx.user.id,
        fileName: input.fileName,
        mimeType: input.mimeType,
        byteSize: data.length,
        storageKey: stored.key,
        storageUrl: stored.url,
      });
    }),
    chat: protectedProcedure.input(z.object({
      question: z.string().trim().min(2).max(1200),
      history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1800) })).max(6).default([]),
    })).mutation(({ input }) => answerHelpQuestion(input)),
    notifications: protectedProcedure.query(({ ctx }) => db.listSupportNotifications(ctx.user.id)),
    markNotificationsRead: protectedProcedure.input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(20) })).mutation(({ ctx, input }) => db.markSupportNotificationsRead(ctx.user.id, input.ids)),
    escalateToHuman: protectedProcedure.input(z.object({
      message: z.string().trim().min(10, "اشرح ما الذي لم يحله المساعد.").max(3000),
    })).mutation(async ({ ctx, input }) => {
      const created = await db.createSupportRequest({
        userId: ctx.user.id,
        roleSnapshot: ctx.user.role,
        category: "question",
        subject: "تصعيد من المساعد الذكي إلى الدعم البشري",
        message: input.message,
      });
      await db.createSupportNotification({
        userId: ctx.user.id,
        supportRequestId: created.id,
        type: "escalation",
        title: "تم تحويل طلبك إلى الدعم البشري",
        message: "سيتابع فريق الدعم طلبك من خلال مركز المساعدة.",
      });
      await notifyOwner({ title: "تصعيد جديد إلى الدعم البشري", content: `طلب دعم جديد برقم ${created.id} يحتاج متابعة بشرية.` }).catch(() => false);
      return created;
    }),
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
    processCityTemplate: analystProcedure.input(z.object({
      fileName: z.string().trim().min(1).max(255),
      rows: z.array(z.record(z.string(), z.unknown())).min(1).max(5000),
    })).mutation(async ({ ctx, input }) => {
      const cityCodes = Array.from(new Set(input.rows.map((row) => String(row["رمز المدينة"] ?? "").trim().toUpperCase()).filter(Boolean)));
      const indicatorCodes = Array.from(new Set(input.rows.map((row) => String(row["رمز المؤشر في المنصة"] ?? "").trim().toUpperCase()).filter(Boolean)));
      const [knownCities, knownIndicators] = await Promise.all([
        db.getSpatialAreasByCodes(cityCodes),
        db.getIndicatorsByCodes(indicatorCodes),
      ]);
      const validation = validateImportedCityStatistics(input.rows, knownCities, knownIndicators);
      const cityByCode = new Map(knownCities.map((city) => [city.code, city]));
      const indicatorByCode = new Map(knownIndicators.map((indicator) => [indicator.code, indicator]));
      const issues = [...validation.issues];
      const writable = [] as typeof validation.accepted;
      for (const row of validation.accepted) {
        const city = cityByCode.get(row.cityCode)!;
        const indicator = indicatorByCode.get(row.indicatorCode)!;
        const existing = await db.getSpatialObservationForPeriod({ spatialAreaId: city.id, indicatorId: indicator.id, year: row.year, period: "annual", quarter: "annual" });
        if (existing && (existing.verificationStatus !== "draft" || existing.enteredBy !== ctx.user.id)) {
          issues.push({ rowNumber: input.rows.indexOf(input.rows.find((candidate) => String(candidate["رمز المدينة"] ?? "").trim().toUpperCase() === row.cityCode && String(candidate["رمز المؤشر في المنصة"] ?? "").trim().toUpperCase() === row.indicatorCode && Number(candidate["السنة المقدمة"]) === row.year)!) + 2, field: "السنة المقدمة", message: "يوجد قياس قائم لهذه المدينة والمؤشر والسنة ولا يمكن استبداله بالاستيراد لأنه ليس مسودة تخص مُدخل الملف.", severity: "error" });
          continue;
        }
        writable.push(row);
      }
      const jobId = await db.createImportJob({
        fileName: input.fileName,
        fileType: "Excel",
        status: issues.length ? "completed_with_errors" : "completed",
        totalRows: input.rows.length - validation.ignoredRows,
        acceptedRows: writable.length,
        rejectedRows: input.rows.length - validation.ignoredRows - writable.length,
        submittedBy: ctx.user.id,
      });
      await db.createImportIssues(jobId, issues);
      for (const row of writable) {
        const city = cityByCode.get(row.cityCode)!;
        const indicator = indicatorByCode.get(row.indicatorCode)!;
        const source = row.sourceTitle.slice(0, 500);
        const notes = [
          `استيراد من نموذج طلب بيانات المدن السياحية.`,
          `جدول/صفحة: ${row.tableOrPage}.`,
          `مرجع/رابط: ${row.reference}.`,
          row.publicationDate ? `تاريخ النشر: ${row.publicationDate}.` : null,
          row.provider ? `الجهة المزودة: ${row.provider}.` : null,
          row.notes ? `ملاحظات: ${row.notes}` : null,
        ].filter(Boolean).join(" ");
        await db.upsertSpatialObservation({ spatialAreaId: city.id, indicatorId: indicator.id, year: row.year, period: "annual", quarter: "annual", value: String(row.value), source, notes, enteredBy: ctx.user.id, verificationStatus: "draft" });
      }
      return { jobId, acceptedRows: writable.length, rejectedRows: input.rows.length - validation.ignoredRows - writable.length, ignoredRows: validation.ignoredRows, issues };
    }),
  }),
  users: router({
    list: roleManagementProcedure.query(() => db.listUsers()),
    accessOverview: roleManagementProcedure.query(async ({ ctx }) => ({
      ...(await db.getAdministrativeAccessOverview()),
      canManageMembers: Boolean(ENV.ownerOpenId) && ctx.user!.openId === ENV.ownerOpenId,
    })),
    updateRole: roleManagementProcedure.input(z.object({ id: z.number().int().positive(), role: roleSchema })).mutation(async ({ ctx, input }) => {
      if (ctx.user!.id === input.id && input.role !== "admin") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن للمسؤول إلغاء دور admin الخاص به من هذه الصفحة." });
      }
      const membership = await db.getAdministrativeMemberByUserId(input.id);
      if (input.role !== "admin" && membership?.status === "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "علّق العضوية الإدارية أولاً قبل إزالة دور admin." });
      }
      return db.updateUserRole(input.id, input.role, ctx.user!.id);
    }),
    setAdministrativeMember: ownerProcedure.input(z.object({
      userId: z.number().int().positive(),
      status: z.enum(["active", "suspended"]),
      canManageRoles: z.boolean(),
      canApproveReleases: z.boolean(),
      canReviewSecurity: z.boolean(),
    })).mutation(async ({ ctx, input }) => {
      const target = (await db.listUsers()).find((candidate) => candidate.id === input.userId);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم المحدد غير موجود." });
      if (target.role !== "admin") throw new TRPCError({ code: "BAD_REQUEST", message: "يتطلب منح عضوية إدارية أن يحمل المستخدم دور admin أولاً." });
      return db.upsertAdministrativeMember(input, ctx.user!.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
