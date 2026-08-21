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
export type ImportJob = typeof importJobs.$inferSelect;
export type ImportIssue = typeof importIssues.$inferSelect;
