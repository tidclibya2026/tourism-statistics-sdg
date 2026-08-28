export type MigrationJournalEntry = { idx: number; tag: string };

export type MigrationInspection = {
  ok: boolean;
  migrationCount: number;
  latestMigration: string | null;
  errors: string[];
  warnings: string[];
};

const destructivePattern = /\b(?:DROP\s+(?:TABLE|DATABASE|COLUMN)|TRUNCATE\s+TABLE)\b/i;

export function inspectMigrationSet(
  entries: MigrationJournalEntry[],
  sqlFiles: string[],
  sqlContents: Record<string, string>
): MigrationInspection {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ordered = [...entries].sort((a, b) => a.idx - b.idx);
  const indexes = new Set<number>();
  const tags = new Set<string>();

  for (const entry of ordered) {
    if (indexes.has(entry.idx)) errors.push(`رقم ترحيل مكرر: ${entry.idx}`);
    if (tags.has(entry.tag)) errors.push(`وسم ترحيل مكرر: ${entry.tag}`);
    indexes.add(entry.idx);
    tags.add(entry.tag);
    if (!sqlFiles.includes(`${entry.tag}.sql`)) {
      errors.push(`ملف SQL مفقود للترحيل: ${entry.tag}`);
    }
  }

  ordered.forEach((entry, position) => {
    if (entry.idx !== position) {
      errors.push(`تسلسل الترحيلات غير متصل عند الفهرس ${position}`);
    }
  });

  for (const file of sqlFiles) {
    const tag = file.replace(/\.sql$/i, "");
    if (!tags.has(tag)) warnings.push(`ملف SQL غير مسجل في journal: ${file}`);
    if (destructivePattern.test(sqlContents[file] ?? "")) {
      warnings.push(`الترحيل يحتاج مراجعة تدميرية صريحة: ${file}`);
    }
  }

  return {
    ok: errors.length === 0,
    migrationCount: ordered.length,
    latestMigration: ordered.at(-1)?.tag ?? null,
    errors,
    warnings,
  };
}
