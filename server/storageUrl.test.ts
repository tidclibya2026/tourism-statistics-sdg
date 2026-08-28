import { describe, expect, it } from "vitest";
import { buildStorageAssetUrl } from "../client/src/lib/storageAssets";
import { buildPublicStorageUrl } from "./_core/storageUrl";

describe("provider-neutral storage URLs", () => {
  it("keeps the legacy proxy as the compatible default", () => {
    expect(buildStorageAssetUrl("reports/file.xlsx")).toBe(
      "/manus-storage/reports/file.xlsx"
    );
    expect(buildPublicStorageUrl("reports/file.xlsx")).toBe(
      "/manus-storage/reports/file.xlsx"
    );
  });

  it("supports an institutional CDN without changing asset keys", () => {
    const baseUrl = "https://assets.tourism.gov.ly/";
    expect(buildStorageAssetUrl("reports/file.xlsx", baseUrl)).toBe(
      "https://assets.tourism.gov.ly/reports/file.xlsx"
    );
    expect(buildPublicStorageUrl("reports/file.xlsx", baseUrl)).toBe(
      "https://assets.tourism.gov.ly/reports/file.xlsx"
    );
  });

  it("rejects empty and traversing keys", () => {
    expect(() => buildStorageAssetUrl("../secret.env")).toThrow(
      "Storage key is invalid"
    );
    expect(() => buildPublicStorageUrl("")).toThrow("Storage key is invalid");
  });
});
