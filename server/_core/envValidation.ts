type RuntimeEnvironment = Record<string, string | undefined>;

export type EnvironmentValidation = {
  errors: string[];
  warnings: string[];
};

const commonRequired = ["DATABASE_URL", "JWT_SECRET"] as const;
const providerRequired = {
  manus: ["VITE_APP_ID", "OAUTH_SERVER_URL", "VITE_OAUTH_PORTAL_URL"],
  oidc: [
    "AUTH_CLIENT_ID",
    "AUTH_CLIENT_SECRET",
    "OIDC_ISSUER_URL",
    "OIDC_TOKEN_URL",
    "OIDC_JWKS_URL",
    "VITE_AUTH_PROVIDER",
    "VITE_AUTH_CLIENT_ID",
    "VITE_OIDC_AUTHORIZATION_URL",
  ],
} as const;

function isHttpUrl(value: string, requireTls: boolean) {
  try {
    const url = new URL(value);
    return requireTls
      ? url.protocol === "https:"
      : url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function validateRuntimeEnvironment(
  environment: RuntimeEnvironment
): EnvironmentValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = environment.NODE_ENV === "production";
  const authProvider = environment.AUTH_PROVIDER?.trim() || "manus";

  if (authProvider !== "manus" && authProvider !== "oidc") {
    errors.push(`AUTH_PROVIDER غير مدعوم حالياً: ${authProvider}`);
  }

  const required = [
    ...commonRequired,
    ...(authProvider === "oidc"
      ? providerRequired.oidc
      : providerRequired.manus),
  ];
  for (const name of required) {
    if (!environment[name]?.trim()) {
      (isProduction ? errors : warnings).push(`${name} غير مضبوط`);
    }
  }

  const jwtSecret = environment.JWT_SECRET?.trim();
  if (jwtSecret && jwtSecret.length < 32) {
    (isProduction ? errors : warnings).push(
      "JWT_SECRET يجب ألا يقل عن 32 حرفاً"
    );
  }

  const databaseUrl = environment.DATABASE_URL?.trim();
  if (databaseUrl && !/^mysql2?:\/\//i.test(databaseUrl)) {
    (isProduction ? errors : warnings).push(
      "DATABASE_URL يجب أن يستخدم mysql:// أو mysql2://"
    );
  }

  const readinessTimeout = Number(environment.READINESS_TIMEOUT_MS ?? 3_000);
  if (!Number.isInteger(readinessTimeout) || readinessTimeout < 250 || readinessTimeout > 10_000) {
    errors.push("READINESS_TIMEOUT_MS يجب أن يكون عدداً صحيحاً بين 250 و10000");
  }

  const oauthServerUrl = environment.OAUTH_SERVER_URL?.trim();
  if (oauthServerUrl && !isHttpUrl(oauthServerUrl, isProduction)) {
    (isProduction ? errors : warnings).push(
      isProduction
        ? "OAUTH_SERVER_URL يجب أن يكون رابط HTTPS صالحاً"
        : "OAUTH_SERVER_URL ليس رابط HTTP/HTTPS صالحاً"
    );
  }

  if (authProvider === "oidc") {
    for (const name of [
      "OIDC_ISSUER_URL",
      "OIDC_TOKEN_URL",
      "OIDC_JWKS_URL",
      "VITE_OIDC_AUTHORIZATION_URL",
    ] as const) {
      const value = environment[name]?.trim();
      if (value && !isHttpUrl(value, isProduction)) {
        (isProduction ? errors : warnings).push(
          `${name} يجب أن يكون رابط ${isProduction ? "HTTPS" : "HTTP/HTTPS"} صالحاً`
        );
      }
    }

    if (
      environment.VITE_AUTH_PROVIDER?.trim().toLowerCase() !== "oidc"
    ) {
      errors.push("VITE_AUTH_PROVIDER يجب أن يطابق AUTH_PROVIDER");
    }

    if (
      environment.AUTH_CLIENT_ID?.trim() &&
      environment.VITE_AUTH_CLIENT_ID?.trim() &&
      environment.AUTH_CLIENT_ID.trim() !== environment.VITE_AUTH_CLIENT_ID.trim()
    ) {
      errors.push("AUTH_CLIENT_ID وVITE_AUTH_CLIENT_ID يجب أن يتطابقا");
    }
  }

  if (environment.TOURISM_DEPLOYMENT_ENV === "production" && !isProduction) {
    warnings.push(
      "TOURISM_DEPLOYMENT_ENV=production بينما NODE_ENV ليس production"
    );
  }

  return { errors, warnings };
}

export function assertRuntimeEnvironment(environment: RuntimeEnvironment) {
  const result = validateRuntimeEnvironment(environment);
  for (const warning of result.warnings)
    console.warn(`[Environment] ${warning}`);
  if (result.errors.length > 0) {
    throw new Error(
      `إعداد بيئة التشغيل غير مكتمل:\n- ${result.errors.join("\n- ")}`
    );
  }
  return result;
}
