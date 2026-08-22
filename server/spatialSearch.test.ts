import { describe, expect, it } from "vitest";
import { filterSpatialLocations } from "../shared/spatialSearch";

const locations = [
  { id: 1, code: "REG-EAST", name: "برقة التاريخية", type: "region" as const, parentId: null, parentName: null },
  { id: 2, code: "CITY-BEN", name: "بنغازي", type: "city" as const, parentId: 1, parentName: "برقة التاريخية" },
  { id: 3, code: "REG-WEST", name: "طرابلس التاريخية", type: "region" as const, parentId: null, parentName: null },
  { id: 4, code: "CITY-TRI", name: "طرابلس", type: "city" as const, parentId: 3, parentName: "طرابلس التاريخية" },
];

describe("spatial location search", () => {
  it("finds a city by its name or code", () => {
    expect(filterSpatialLocations(locations, { query: "بنغ", type: "all", regionId: "all" }).map((item) => item.id)).toEqual([2]);
    expect(filterSpatialLocations(locations, { query: "CITY-TRI", type: "city", regionId: "all" }).map((item) => item.id)).toEqual([4]);
  });

  it("combines location type and region filters without returning unrelated locations", () => {
    expect(filterSpatialLocations(locations, { query: "", type: "city", regionId: "1" }).map((item) => item.id)).toEqual([2]);
    expect(filterSpatialLocations(locations, { query: "", type: "region", regionId: "3" }).map((item) => item.id)).toEqual([3]);
  });
});
