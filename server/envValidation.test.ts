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
  VITE_OAUTH_PORTAL_URL: "https://oauth.example.com",
};

const validOidcProductionEnvironment = {
  NODE_ENV: "production",
  AUTH_PROVIDER: "oidc",
  VITE_AUTH_PROVIDER: "oidc",
  DATABASE_URL: "mysql://tourism:secret@database.example.com:3306/tourism",
  JWT_SECRET: "a-secure-session-secret-with-32-characters",
  AUTH_CLIENT_ID: "tourism-platform",
  AUTH_CLIENT_SECRET: "client-secret",
  VITE_AUTH_CLIENT_ID: "tourism-platform",
  OIDC_ISSUER_URL: "https://identity.gov.ly",
  OIDC_TOKEN_URL: "https://identity.gov.ly/oauth/token",
  OIDC_JWKS_URL: "https://identity.gov.ly/.well-known/jwks.json",
  VITE_OIDC_AUTHORIZATION_URL: "https://identity.gov.ly/oauth/authorize",
};

describe("runtime environment validation", () => {
  it("accepts a complete production configuration", () => {
    expect(validateRuntimeEnvironment(validProductionEnvironment)).toEqual({
      errors: [],
      warnings: [],
    });
  });

  it("accepts a complete institutional OIDC configuration", () => {
    expect(validateRuntimeEnvironment(validOidcProductionEnvironment)).toEqual({
      errors: [],
      warnings: [],
    });
  });

  it("requires complete and consistent OIDC settings", () => {
    const result = validateRuntimeEnvironment({
      ...validOidcProductionEnvironment,
      VITE_AUTH_CLIENT_ID: "another-client",
      OIDC_JWKS_URL: "http://identity.gov.ly/jwks.json",
    });
    expect(result.errors).toContain(
      "AUTH_CLIENT_ID وVITE_AUTH_CLIENT_ID يجب أن يتطابقا"
    );
    expect(result.errors).toContain(
      "OIDC_JWKS_URL يجب أن يكون رابط HTTPS صالحاً"
    );
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

  it("rejects an unsafe readiness timeout", () => {
    const result = validateRuntimeEnvironment({
      ...validProductionEnvironment,
      READINESS_TIMEOUT_MS: "30000",
    });
    expect(result.errors).toContain(
      "READINESS_TIMEOUT_MS يجب أن يكون عدداً صحيحاً بين 250 و10000"
    );
  });

  it("rejects an unsafe graceful shutdown timeout", () => {
    const result = validateRuntimeEnvironment({
      ...validProductionEnvironment,
      SHUTDOWN_TIMEOUT_MS: "500",
    });
    expect(result.errors).toContain(
      "SHUTDOWN_TIMEOUT_MS يجب أن يكون عدداً صحيحاً بين 1000 و30000"
    );
  });
});
