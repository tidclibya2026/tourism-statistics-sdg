import {
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core user table backing the Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "analyst", "viewer"]).default("viewer").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** Explicit allow-list for administrators who may operate sensitive controls. */
export const administrativeMembers = mysqlTable(
  "administrativeMembers",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["active", "suspended"]).default("active").notNull(),
    canManageRoles: int("canManageRoles").default(0).notNull(),
    canApproveReleases: int("canApproveReleases").default(0).notNull(),
    canReviewSecurity: int("canReviewSecurity").default(0).notNull(),
    grantedBy: int("grantedBy").references(() => users.id, { onDelete: "set null" }),
    grantedAt: timestamp("grantedAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("administrative_members_user_unique").on(table.userId),
    index("administrative_members_status_idx").on(table.status),
  ],
);

/** Audit trail for membership grants, suspensions, and role changes. */
export const administrativeAccessEvents = mysqlTable(
  "administrativeAccessEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    targetUserId: int("targetUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    actorUserId: int("actorUserId").notNull().references(() => users.id, { onDelete: "restrict" }),
    action: mysqlEnum("action", ["member_granted", "member_updated", "member_suspended", "role_updated"]).notNull(),
    detail: varchar("detail", { length: 500 }),
    actedAt: timestamp("actedAt").defaultNow().notNull(),
  },
  (table) => [
    index("administrative_access_target_idx").on(table.targetUserId),
    index("administrative_access_actor_idx").on(table.actorUserId),
  ],
);

/** Immutable summaries from manual or scheduled dependency vulnerability reviews. */
export const dependencyReviewRuns = mysqlTable(
  "dependencyReviewRuns",
  {
    id: int("id").autoincrement().primaryKey(),
    trigger: mysqlEnum("trigger", ["manual", "scheduled"]).notNull(),
    status: mysqlEnum("status", ["completed", "failed"]).notNull(),
    criticalCount: int("criticalCount").default(0).notNull(),
    highCount: int("highCount").default(0).notNull(),
    moderateCount: int("moderateCount").default(0).notNull(),
    lowCount: int("lowCount").default(0).notNull(),
    summary: text("summary").notNull(),
    errorMessage: varchar("errorMessage", { length: 1000 }),
    initiatedBy: int("initiatedBy").references(() => users.id, { onDelete: "set null" }),
    startedAt: timestamp("startedAt").defaultNow().notNull(),
    completedAt: timestamp("completedAt"),
  },
  (table) => [
    index("dependency_review_started_idx").on(table.startedAt),
    index("dependency_review_status_idx").on(table.status),
  ],
);

/** A durable, staging-only mapping between the platform cron task and its security review job. */
export const dependencyReviewSchedules = mysqlTable(
  "dependencyReviewSchedules",
  {
    id: int("id").autoincrement().primaryKey(),
    environment: mysqlEnum("environment", ["staging", "production"]).default("staging").notNull(),
    enabled: int("enabled").default(0).notNull(),
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
    lastRunAt: timestamp("lastRunAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("dependency_review_schedule_task_unique").on(table.scheduleCronTaskUid),
    index("dependency_review_schedule_environment_idx").on(table.environment),
  ],
);

/** Questions and issue reports submitted from the in-product help center. */
export const supportRequests = mysqlTable(
  "supportRequests",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    roleSnapshot: mysqlEnum("roleSnapshot", ["admin", "analyst", "viewer"]).notNull(),
    category: mysqlEnum("category", ["question", "issue", "suggestion"]).notNull(),
    subject: varchar("subject", { length: 180 }).notNull(),
    message: text("message").notNull(),
    status: mysqlEnum("status", ["open", "in_progress", "resolved", "closed"]).default("open").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("support_requests_status_idx").on(table.status),
    index("support_requests_user_idx").on(table.userId),
    index("support_requests_created_idx").on(table.createdAt),
  ],
);

/** One helpful/not-helpful signal per signed-in user and help section. */
export const helpContentRatings = mysqlTable(
  "helpContentRatings",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    sectionId: varchar("sectionId", { length: 80 }).notNull(),
    rating: mysqlEnum("rating", ["helpful", "not_helpful"]).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("help_ratings_user_section_unique").on(table.userId, table.sectionId),
    index("help_ratings_section_idx").on(table.sectionId),
  ],
);

export const indicators = mysqlTable(
  "indicators",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    axis: mysqlEnum("axis", ["اقتصادي", "اجتماعي", "بيئي"]).notNull(),
    framework: mysqlEnum("framework", ["UNWTO", "SDG"]).notNull(),
    sdgReference: mysqlEnum("sdgReference", ["SDG 8", "SDG 11", "SDG 12", "SDG 14", "SDG 17"]),
    unit: varchar("unit", { length: 128 }).notNull(),
    calculationMethod: text("calculationMethod"),
    officialSource: varchar("officialSource", { length: 255 }),
    status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
    createdBy: int("createdBy").references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("indicators_code_unique").on(table.code),
    index("indicators_axis_idx").on(table.axis),
    index("indicators_framework_idx").on(table.framework),
  ],
);

export const indicatorObservations = mysqlTable(
  "indicatorObservations",
  {
    id: int("id").autoincrement().primaryKey(),
    indicatorId: int("indicatorId")
      .notNull()
      .references(() => indicators.id, { onDelete: "cascade" }),
    year: int("year").notNull(),
    period: mysqlEnum("period", ["annual", "quarterly"]).notNull(),
    quarter: mysqlEnum("quarter", ["annual", "Q1", "Q2", "Q3", "Q4"]).default("annual").notNull(),
    value: decimal("value", { precision: 18, scale: 4 }).notNull(),
    targetValue: decimal("targetValue", { precision: 18, scale: 4 }),
    source: varchar("source", { length: 255 }),
    verificationStatus: mysqlEnum("verificationStatus", ["draft", "reviewed", "approved", "rejected"])
      .default("draft")
      .notNull(),
    notes: text("notes"),
    enteredBy: int("enteredBy").references(() => users.id, { onDelete: "set null" }),
    verifiedBy: int("verifiedBy").references(() => users.id, { onDelete: "set null" }),
    verifiedAt: timestamp("verifiedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("observations_period_unique").on(table.indicatorId, table.year, table.period, table.quarter),
    index("observations_year_idx").on(table.year),
    index("observations_status_idx").on(table.verificationStatus),
  ],
);

export const spatialAreas = mysqlTable(
  "spatialAreas",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    type: mysqlEnum("type", ["region", "city"]).notNull(),
    parentId: int("parentId"),
    geographicSource: varchar("geographicSource", { length: 500 }),
    boundaryReferenceTitle: varchar("boundaryReferenceTitle", { length: 255 }),
    boundaryReferenceUrl: varchar("boundaryReferenceUrl", { length: 500 }),
    boundaryStatus: mysqlEnum("boundaryStatus", ["not_provided", "submitted", "verified"]).default("not_provided").notNull(),
    boundaryVerifiedBy: int("boundaryVerifiedBy").references(() => users.id, { onDelete: "set null" }),
    boundaryVerifiedAt: timestamp("boundaryVerifiedAt"),
    status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("spatial_areas_code_unique").on(table.code),
    index("spatial_areas_parent_idx").on(table.parentId),
    index("spatial_areas_type_idx").on(table.type),
  ],
);

export const spatialObservations = mysqlTable(
  "spatialObservations",
  {
    id: int("id").autoincrement().primaryKey(),
    spatialAreaId: int("spatialAreaId").notNull().references(() => spatialAreas.id, { onDelete: "restrict" }),
    indicatorId: int("indicatorId").notNull().references(() => indicators.id, { onDelete: "restrict" }),
    year: int("year").notNull(),
    period: mysqlEnum("period", ["annual", "quarterly"]).notNull(),
    quarter: mysqlEnum("quarter", ["annual", "Q1", "Q2", "Q3", "Q4"]).default("annual").notNull(),
    value: decimal("value", { precision: 18, scale: 4 }).notNull(),
    targetValue: decimal("targetValue", { precision: 18, scale: 4 }),
    source: varchar("source", { length: 500 }),
    verificationStatus: mysqlEnum("verificationStatus", ["draft", "reviewed", "approved", "rejected"]).default("draft").notNull(),
    notes: text("notes"),
    enteredBy: int("enteredBy").references(() => users.id, { onDelete: "set null" }),
    verifiedBy: int("verifiedBy").references(() => users.id, { onDelete: "set null" }),
    verifiedAt: timestamp("verifiedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("spatial_observations_period_unique").on(table.spatialAreaId, table.indicatorId, table.year, table.period, table.quarter),
    index("spatial_observations_area_idx").on(table.spatialAreaId),
    index("spatial_observations_indicator_idx").on(table.indicatorId),
    index("spatial_observations_status_idx").on(table.verificationStatus),
  ],
);

export const spatialObservationReviewEvents = mysqlTable(
  "spatialObservationReviewEvents",
  {
    id: int("id").autoincrement().primaryKey(),
    spatialObservationId: int("spatialObservationId").notNull().references(() => spatialObservations.id, { onDelete: "cascade" }),
    fromStatus: mysqlEnum("fromStatus", ["draft", "reviewed", "approved", "rejected"]),
    toStatus: mysqlEnum("toStatus", ["draft", "reviewed", "approved", "rejected"]).notNull(),
    note: text("note"),
    actedBy: int("actedBy").references(() => users.id, { onDelete: "set null" }),
    actedAt: timestamp("actedAt").defaultNow().notNull(),
  },
  (table) => [
    index("spatial_review_events_observation_idx").on(table.spatialObservationId),
    index("spatial_review_events_status_idx").on(table.toStatus),
  ],
);

export const publicationDestinations = mysqlTable(
  "publicationDestinations",
  {
    id: int("id").autoincrement().primaryKey(),
    code: mysqlEnum("code", ["visit_libya", "libya_atlas"]).notNull(),
    name: varchar("name", { length: 128 }).notNull(),
    description: text("description"),
    deliveryMode: mysqlEnum("deliveryMode", ["api_contract"]).default("api_contract").notNull(),
    status: mysqlEnum("status", ["draft", "ready", "paused"]).default("draft").notNull(),
    updatedBy: int("updatedBy").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("publication_destinations_code_unique").on(table.code)],
);

export const importJobs = mysqlTable("importJobs", {
  id: int("id").autoincrement().primaryKey(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: mysqlEnum("fileType", ["Excel", "CSV"]).notNull(),
  status: mysqlEnum("status", ["validating", "completed", "completed_with_errors", "failed"]).notNull(),
  totalRows: int("totalRows").default(0).notNull(),
  acceptedRows: int("acceptedRows").default(0).notNull(),
  rejectedRows: int("rejectedRows").default(0).notNull(),
  submittedBy: int("submittedBy").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const importIssues = mysqlTable(
  "importIssues",
  {
    id: int("id").autoincrement().primaryKey(),
    importJobId: int("importJobId")
      .notNull()
      .references(() => importJobs.id, { onDelete: "cascade" }),
    rowNumber: int("rowNumber").notNull(),
    field: varchar("field", { length: 128 }),
    message: varchar("message", { length: 500 }).notNull(),
    severity: mysqlEnum("severity", ["error", "warning"]).default("error").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("import_issues_job_idx").on(table.importJobId)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Indicator = typeof indicators.$inferSelect;
export type InsertIndicator = typeof indicators.$inferInsert;
export type IndicatorObservation = typeof indicatorObservations.$inferSelect;
export type InsertIndicatorObservation = typeof indicatorObservations.$inferInsert;
export type SpatialArea = typeof spatialAreas.$inferSelect;
export type InsertSpatialArea = typeof spatialAreas.$inferInsert;
export type SpatialObservation = typeof spatialObservations.$inferSelect;
export type InsertSpatialObservation = typeof spatialObservations.$inferInsert;
export type PublicationDestination = typeof publicationDestinations.$inferSelect;
export type ImportJob = typeof importJobs.$inferSelect;
export type ImportIssue = typeof importIssues.$inferSelect;
