export type ObservationWorkflowRole = "admin" | "analyst" | "viewer";
export type ObservationWorkflowStatus = "draft" | "reviewed" | "approved" | "rejected";

export type ObservationStatusAction = {
  status: ObservationWorkflowStatus;
  label: string;
};

const statusLabels: Record<ObservationWorkflowStatus, string> = {
  draft: "إعادة إلى مسودة",
  reviewed: "إرسال للمراجعة المستقلة",
  approved: "اعتماد للنشر",
  rejected: "رفض القياس",
};

export function getObservationStatusActions(input: {
  role: ObservationWorkflowRole;
  currentStatus: ObservationWorkflowStatus;
  enteredBy: number | null;
  currentUserId: number;
}): ObservationStatusAction[] {
  const isOwner = input.enteredBy === input.currentUserId;
  if (input.role === "viewer" || input.currentStatus === "approved") return [];

  if (input.role === "admin") {
    if (input.currentStatus === "rejected") return [{ status: "draft", label: statusLabels.draft }];
    if (input.currentStatus === "reviewed") {
      return [
        { status: "approved", label: statusLabels.approved },
        { status: "rejected", label: statusLabels.rejected },
      ];
    }
    if (input.currentStatus === "draft") {
      return [
        ...(isOwner ? [] : [{ status: "reviewed" as const, label: statusLabels.reviewed }]),
        { status: "rejected", label: statusLabels.rejected },
      ];
    }
    return [];
  }

  if (isOwner) return [];
  if (input.currentStatus === "draft") {
    return [
      { status: "reviewed", label: statusLabels.reviewed },
      { status: "rejected", label: statusLabels.rejected },
    ];
  }
  if (input.currentStatus === "reviewed") return [{ status: "rejected", label: statusLabels.rejected }];
  return [];
}
