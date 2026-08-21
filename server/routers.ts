import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { validateImportedObservations } from "./validation";

const axisSchema = z.enum(["اقتصادي", "اجتماعي", "بيئي"]);
const frameworkSchema = z.enum(["UNWTO", "SDG"]);
const sdgSchema = z.enum(["SDG 8", "SDG 11", "SDG 12", "SDG 14", "SDG 17"]);
const statusSchema = z.enum(["draft", "published", "archived"]);
const verificationSchema = z.enum(["draft", "reviewed", "approved", "rejected"]);
const roleSchema = z.enum(["admin", "analyst", "viewer"]);

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
    }).optional()).query(({ input }) => db.getDashboardData(input)),
  }),
  indicators: router({
    list: protectedProcedure.input(z.object({ axis: axisSchema.optional(), framework: frameworkSchema.optional(), status: statusSchema.optional() }).optional()).query(({ input }) => db.listIndicators(input)),
    create: adminProcedure.input(indicatorInput).mutation(({ ctx, input }) => db.createIndicator({ ...input, createdBy: ctx.user.id })),
    update: adminProcedure.input(indicatorInput.partial().extend({ id: z.number().int().positive() })).mutation(({ input }) => {
      const { id, ...values } = input;
      return db.updateIndicator(id, values);
    }),
    delete: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => db.deleteIndicator(input.id)),
  }),
  observations: router({
    list: protectedProcedure.input(z.object({ indicatorIds: z.array(z.number().int().positive()).optional(), yearFrom: z.number().int().optional(), yearTo: z.number().int().optional(), status: verificationSchema.optional() }).optional()).query(({ input }) => db.listObservations(input)),
    upsert: analystProcedure.input(observationInput).mutation(({ ctx, input }) => {
      if (input.period === "annual" && input.quarter !== "annual") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "البيانات السنوية يجب أن تستخدم الفترة annual." });
      }
      if (input.period === "quarterly" && input.quarter === "annual") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "البيانات الربع سنوية تتطلب تحديد الربع." });
      }
      return db.upsertObservation({ ...input, value: String(input.value), targetValue: input.targetValue === null ? null : input.targetValue === undefined ? undefined : String(input.targetValue), enteredBy: ctx.user.id, verificationStatus: "draft" });
    }),
    setStatus: analystProcedure.input(z.object({ id: z.number().int().positive(), status: verificationSchema })).mutation(({ ctx, input }) => db.changeObservationStatus(input.id, input.status, ctx.user.id)),
    delete: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => db.deleteObservation(input.id)),
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
