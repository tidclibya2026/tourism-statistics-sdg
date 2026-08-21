import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createObservationPayload } from "../client/src/lib/observationPayload";
import { IndicatorProfile } from "../client/src/pages/DataEntry";

describe("data-entry selected indicator integration", () => {
  it("renders the selected indicator type, framework and unit in the profile card", () => {
    const html = renderToStaticMarkup(createElement(IndicatorProfile, {
      indicator: {
        code: "ARR-001",
        axis: "اقتصادي",
        framework: "SDG",
        sdgReference: "SDG 8",
        unit: "عدد",
        status: "published",
        officialSource: "مركز المعلومات",
        calculationMethod: "العد السنوي",
      },
    }));

    expect(html).toContain("نوع المؤشر (المحور)");
    expect(html).toContain("اقتصادي");
    expect(html).toContain("SDG");
    expect(html).toContain("عدد");
  });

  it("preserves the selected indicator identifier and period in the save payload", () => {
    expect(createObservationPayload({
      indicatorId: "42",
      year: "2025",
      period: "quarterly",
      quarter: "Q2",
      value: "1500.5",
      targetValue: "1700",
      source: "المصدر الرسمي",
      notes: "مراجع",
    })).toEqual({
      indicatorId: 42,
      year: 2025,
      period: "quarterly",
      quarter: "Q2",
      value: 1500.5,
      targetValue: 1700,
      source: "المصدر الرسمي",
      notes: "مراجع",
    });
  });
});

