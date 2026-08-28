import { describe, expect, it } from "vitest";
import {
  assertRuntimeEnvironment,
  validateRuntimeEnvironment,
} from "./_core/envValidation";

const validProductionEnvironment = {
  NODE_ENV: "production",
  AUTH_PROVIDER: "manus",
  DATABASE_URL: "mysql://tourism:secret@database.example.com:3306/tourism",
  JWT_SECRET: "a-secure-session-secret-with-32-characters",
  VITE_APP_ID: "tourism-platform",
  OAUTH_SERVER_URL: "https://identity.example.com",
};

describe("runtime environment validation", () => {
  it("accepts a complete production configuration", () => {
    expect(validateRuntimeEnvironment(validProductionEnvironment)).toEqual({
      errors: [],
      warnings: [],
    });
  });

  it("blocks production when required configuration is missing", () => {
    const result = validateRuntimeEnvironment({ NODE_ENV: "production" });
    expect(result.errors).toContain("DATABASE_URL غير مضبوط");
    expect(result.errors).toContain("JWT_SECRET غير مضبوط");
    expect(() => assertRuntimeEnvironment({ NODE_ENV: "production" })).toThrow(
      "إعداد بيئة التشغيل غير مكتمل"
    );
  });

  it("requires secure production values", () => {
    const result = validateRuntimeEnvironment({
      ...validProductionEnvironment,
      JWT_SECRET: "short",
      DATABASE_URL: "postgres://database.example.com/tourism",
      OAUTH_SERVER_URL: "http://identity.example.com",
    });
    expect(result.errors).toContain("JWT_SECRET يجب ألا يقل عن 32 حرفاً");
    expect(result.errors).toContain(
      "DATABASE_URL يجب أن يستخدم mysql:// أو mysql2://"
    );
    expect(result.errors).toContain(
      "OAUTH_SERVER_URL يجب أن يكون رابط HTTPS صالحاً"
    );
  });

  it("warns rather than blocking an incomplete development environment", () => {
    const result = validateRuntimeEnvironment({ NODE_ENV: "development" });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toContain("DATABASE_URL غير مضبوط");
  });
});
