import { describe, expect, it } from "vitest";
import { summarizeHistoricalArchive } from "./historicalArchive";

describe("summarizeHistoricalArchive", () => {
  it("summarizes reviewed historical observations by year and source without treating gaps as zero", () => {
    const result = summarizeHistoricalArchive([
      { observation: { year: 1994, value: "52000", verificationStatus: "reviewed", source: "تقرير 1994", period: "annual", quarter: "annual" }, indicator: { id: 1, code: "HIST-TOURISTS", name: "السياح", unit: "عدد", axis: "اقتصادي", framework: "UNWTO", sdgReference: null } },
      { observation: { year: 1995, value: "56600", verificationStatus: "approved", source: "تقرير 1994", period: "annual", quarter: "annual" }, indicator: { id: 1, code: "HIST-TOURISTS", name: "السياح", unit: "عدد", axis: "اقتصادي", framework: "UNWTO", sdgReference: null } },
      { observation: { year: 1995, value: "194", verificationStatus: "reviewed", source: "تقرير 2000", period: "annual", quarter: "annual" }, indicator: { id: 2, code: "HIST-HOTELS", name: "الفنادق", unit: "عدد", axis: "اقتصادي", framework: "SDG", sdgReference: "SDG 8" } },
    ]);
    expect(result.summary).toMatchObject({ observations: 3, indicators: 2, firstYear: 1994, lastYear: 1995, documentedYears: 2, spanYears: 2, gapYears: 0, reviewed: 2, approved: 1 });
    expect(result.coverage).toEqual([
      { year: 1994, observations: 1, indicators: 1, reviewed: 1, approved: 0 },
      { year: 1995, observations: 2, indicators: 2, reviewed: 1, approved: 1 },
    ]);
    expect(result.sources).toEqual(["تقرير 1994", "تقرير 2000"]);
  });
});
