type RuntimeEnvironment = Record<string, string | undefined>;

export type EnvironmentValidation = {
  errors: string[];
  warnings: string[];
};

const productionRequired = [
  "DATABASE_URL",
  "JWT_SECRET",
  "VITE_APP_ID",
  "OAUTH_SERVER_URL",
] as const;

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

  if (authProvider !== "manus") {
    errors.push(`AUTH_PROVIDER غير مدعوم حالياً: ${authProvider}`);
  }

  for (const name of productionRequired) {
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

  const oauthServerUrl = environment.OAUTH_SERVER_URL?.trim();
  if (oauthServerUrl && !isHttpUrl(oauthServerUrl, isProduction)) {
    (isProduction ? errors : warnings).push(
      isProduction
        ? "OAUTH_SERVER_URL يجب أن يكون رابط HTTPS صالحاً"
        : "OAUTH_SERVER_URL ليس رابط HTTP/HTTPS صالحاً"
    );
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
