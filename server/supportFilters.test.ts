import { describe, expect, it } from "vitest";
import { filterSupportRequests, supportPriority } from "../client/src/lib/supportFilters";

const requests = [
  { roleSnapshot: "viewer", status: "open", category: "issue", subject: "خطأ استيراد", message: "ملف المدن لم يكتمل", submitterName: "سالم" },
  { roleSnapshot: "analyst", status: "in_progress", category: "question", subject: "مراجعة القياس", message: "أحتاج توضيحاً", submitterName: "علي" },
  { roleSnapshot: "viewer", status: "resolved", category: "suggestion", subject: "تطوير الواجهة", message: "اقتراح بسيط", submitterName: "مريم" },
];

describe("support filters", () => {
  it("يعطي أولوية عاجلة للمشكلة الجديدة", () => expect(supportPriority(requests[0])).toBe("urgent"));
  it("يصفّي البحث والدور والأولوية معاً", () => {
    expect(filterSupportRequests(requests, { search: "استيراد", role: "viewer", status: "all", category: "all", priority: "urgent" })).toEqual([requests[0]]);
    expect(filterSupportRequests(requests, { search: "", role: "analyst", status: "in_progress", category: "question", priority: "high" })).toEqual([requests[1]]);
  });
});
