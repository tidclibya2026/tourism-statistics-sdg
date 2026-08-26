import { describe, expect, it } from "vitest";
import { getObservationStatusActions } from "./observationWorkflow";

describe("getObservationStatusActions", () => {
  it("does not offer an analyst approval or self-review", () => {
    expect(getObservationStatusActions({ role: "analyst", currentStatus: "draft", enteredBy: 8, currentUserId: 8 })).toEqual([]);
    expect(getObservationStatusActions({ role: "analyst", currentStatus: "reviewed", enteredBy: 8, currentUserId: 9 })).toEqual([
      { status: "rejected", label: "رفض القياس" },
    ]);
  });

  it("offers an independent analyst only review or rejection of a draft", () => {
    expect(getObservationStatusActions({ role: "analyst", currentStatus: "draft", enteredBy: 8, currentUserId: 9 })).toEqual([
      { status: "reviewed", label: "إرسال للمراجعة المستقلة" },
      { status: "rejected", label: "رفض القياس" },
    ]);
  });

  it("limits approval and restoring rejected records to administrators", () => {
    expect(getObservationStatusActions({ role: "admin", currentStatus: "reviewed", enteredBy: 8, currentUserId: 1 })).toEqual([
      { status: "approved", label: "اعتماد للنشر" },
      { status: "rejected", label: "رفض القياس" },
    ]);
    expect(getObservationStatusActions({ role: "admin", currentStatus: "rejected", enteredBy: 8, currentUserId: 1 })).toEqual([
      { status: "draft", label: "إعادة إلى مسودة" },
    ]);
  });
});
