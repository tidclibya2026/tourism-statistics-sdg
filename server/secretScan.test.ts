import { describe, expect, it } from "vitest";
import { isPlaceholder, scanText } from "../scripts/lib/secret-scan.mjs";

describe("secret scanner", () => {
  it("reports locations without returning secret values", () => {
    const secret = ["ghp", "abcdefghijklmnopqrstuvwxyz123456"].join("_");
    const findings = scanText("fixture.env", `GITHUB_TOKEN=${secret}\n`);
    expect(findings).toEqual(expect.arrayContaining([
      { path: "fixture.env", line: 1, rule: "github-token" },
      { path: "fixture.env", line: 1, rule: "sensitive-assignment" },
    ]));
    expect(JSON.stringify(findings)).not.toContain(secret);
  });

  it("permits documented placeholders", () => {
    expect(isPlaceholder("replace-with-a-long-random-secret")).toBe(true);
    expect(isPlaceholder("${DATABASE_URL}")).toBe(true);
    expect(isPlaceholder("GENERATED_LOCALLY")).toBe(true);
    expect(isPlaceholder("$databasePassword")).toBe(true);
    expect(scanText(".env.example", "DATABASE_URL=mysql://USER:PASSWORD@db.example/app")).toEqual([]);
    expect(scanText("README.md", [
      "JWT_SECRET=ضع_قيمة_عشوائية_طويلة_محلياً",
      "BUILT_IN_FORGE_API_KEY=مفتاح_الخادم_لبيئة_التطوير",
      "VITE_FRONTEND_FORGE_API_KEY=مفتاح_الواجهة_لبيئة_التطوير",
    ].join("\n"))).toEqual([]);
  });

  it("detects private keys and embedded database passwords", () => {
    const privateKeyHeader = ["-----BEGIN", "PRIVATE KEY-----"].join(" ");
    const credentialUrl = ["mysql://app", "real-password@database.internal/app"].join(":");
    const findings = scanText("unsafe.txt", [
      privateKeyHeader,
      credentialUrl,
    ].join("\n"));
    expect(findings.map(item => item.rule)).toEqual(["private-key", "credential-in-url"]);
  });
});
