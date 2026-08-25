import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import * as db from "../db";
import type { TrpcContext } from "./context";
import { ENV } from "./env";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

function authorizedAdminProcedure(capability: "canManageRoles" | "canApproveReleases" | "canReviewSecurity") {
  return adminProcedure.use(t.middleware(async ({ ctx, next }) => {
    const user = ctx.user;
    if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    const isOwner = Boolean(ENV.ownerOpenId) && user.openId === ENV.ownerOpenId;
    if (!isOwner && !(await db.hasAdministrativeCapability(user.id, capability))) {
      throw new TRPCError({ code: "FORBIDDEN", message: "هذه العملية محصورة بعضو إداري مخول صراحة." });
    }
    return next({ ctx: { ...ctx, user } });
  }));
}

export const roleManagementProcedure = authorizedAdminProcedure("canManageRoles");
export const releaseApprovalProcedure = authorizedAdminProcedure("canApproveReleases");
export const securityReviewProcedure = authorizedAdminProcedure("canReviewSecurity");

export const ownerProcedure = adminProcedure.use(t.middleware(async ({ ctx, next }) => {
  const user = ctx.user;
  if (!user || !ENV.ownerOpenId || user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "إدارة أعضاء الإدارة محصورة بمالك المنصة." });
  }
  return next({ ctx: { ...ctx, user } });
}));
