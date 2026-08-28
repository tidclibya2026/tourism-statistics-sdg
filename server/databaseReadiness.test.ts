import { describe, expect, it } from "vitest";
import { inspectMigrationSet } from "./databaseReadiness";

describe("database migration readiness", () => {
  it("accepts a complete non-destructive migration sequence", () => {
    const result = inspectMigrationSet(
      [{ idx: 0, tag: "0000_initial" }, { idx: 1, tag: "0001_indexes" }],
      ["0000_initial.sql", "0001_indexes.sql"],
      { "0000_initial.sql": "CREATE TABLE users (id int);", "0001_indexes.sql": "CREATE INDEX users_id ON users (id);" }
    );
    expect(result).toMatchObject({ ok: true, migrationCount: 2, latestMigration: "0001_indexes", errors: [], warnings: [] });
  });

  it("detects missing, unregistered and destructive migrations", () => {
    const result = inspectMigrationSet(
      [{ idx: 1, tag: "0001_expected" }],
      ["0002_manual.sql"],
      { "0002_manual.sql": "DROP TABLE users;" }
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("ملف SQL مفقود للترحيل: 0001_expected");
    expect(result.errors).toContain("تسلسل الترحيلات غير متصل عند الفهرس 0");
    expect(result.warnings).toContain("ملف SQL غير مسجل في journal: 0002_manual.sql");
    expect(result.warnings).toContain("الترحيل يحتاج مراجعة تدميرية صريحة: 0002_manual.sql");
  });
});
