export type Post2021WorkflowRecord = {
  id: number;
  spatialAreaId: number;
  year: number;
  period: "annual" | "quarterly";
  verificationStatus: "draft" | "reviewed" | "approved" | "rejected";
  enteredBy: number | null;
};

export function getPost2021CityWorkflow<T extends Post2021WorkflowRecord>(rows: T[], cityAreaIds: Set<number>, currentUserId: number | null) {
  const inScope = rows.filter((row) => cityAreaIds.has(row.spatialAreaId) && row.period === "annual" && row.year >= 2022);
  return {
    drafts: inScope.filter((row) => row.verificationStatus === "draft"),
    reviewable: inScope.filter((row) => row.verificationStatus === "draft" && row.enteredBy !== currentUserId),
    reviewed: inScope.filter((row) => row.verificationStatus === "reviewed"),
  };
}
