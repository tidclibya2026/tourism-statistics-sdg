export type SupportFilterRole = "all" | "admin" | "analyst" | "viewer";
export type SupportFilterStatus = "all" | "open" | "in_progress" | "resolved" | "closed";
export type SupportFilterCategory = "all" | "question" | "issue" | "suggestion";
export type SupportFilterPriority = "all" | "urgent" | "high" | "normal" | "completed";

export function supportPriority(request: { status: string; category: string }) {
  if (request.status === "open" && request.category === "issue") return "urgent" as const;
  if (request.status === "open" || request.status === "in_progress") return "high" as const;
  if (request.status === "resolved" || request.status === "closed") return "completed" as const;
  return "normal" as const;
}

export function filterSupportRequests<T extends { roleSnapshot: string; status: string; category: string; subject: string; message: string; submitterName?: string | null; submitterEmail?: string | null }>(requests: T[], filters: { search: string; role: SupportFilterRole; status: SupportFilterStatus; category: SupportFilterCategory; priority: SupportFilterPriority }) {
  const search = filters.search.trim().toLocaleLowerCase("ar-LY");
  return requests.filter((request) => {
    const text = [request.subject, request.message, request.submitterName ?? "", request.submitterEmail ?? ""].join(" ").toLocaleLowerCase("ar-LY");
    return (!search || text.includes(search)) && (filters.role === "all" || request.roleSnapshot === filters.role) && (filters.status === "all" || request.status === filters.status) && (filters.category === "all" || request.category === filters.category) && (filters.priority === "all" || supportPriority(request) === filters.priority);
  });
}
