import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("container configuration", () => {
  it("uses a non-root runtime and excludes secrets from the build context", () => {
    const dockerfile = readFileSync("Dockerfile", "utf8");
    const dockerignore = readFileSync(".dockerignore", "utf8");
    expect(dockerfile).toContain("FROM node:22.16.0-bookworm-slim AS runtime");
    expect(dockerfile).toContain("apt-get upgrade -y --no-install-recommends");
    expect(dockerfile).toContain("/usr/local/lib/node_modules/npm");
    expect(dockerfile).toContain("/usr/local/lib/node_modules/corepack");
    expect(dockerfile).toContain("USER tourism");
    expect(dockerfile).toContain("HEALTHCHECK");
    expect(dockerfile).not.toMatch(/(?:JWT_SECRET|DATABASE_URL|AUTH_CLIENT_SECRET)=/);
    expect(dockerignore).toMatch(/^\.env$/m);
    expect(dockerignore).toMatch(/^\.env\.\*$/m);
  });

  it("provides an isolated internal staging stack and local secret initialization", () => {
    const compose = readFileSync("compose.staging.internal.yml", "utf8");
    const initializer = readFileSync("scripts/initialize-internal-staging.ps1", "utf8");
    expect(compose).toContain("127.0.0.1:${STAGING_DB_PORT:-3307}:3306");
    expect(compose).toContain("${APP_BIND_ADDRESS:-192.168.1.2}:${APP_PORT:-3000}:3000");
    expect(compose).toContain("condition: service_healthy");
    expect(compose).toContain("read_only: true");
    expect(compose).toContain("cap_drop: [ALL]");
    expect(initializer).toContain("RandomNumberGenerator");
    expect(initializer).not.toMatch(/JWT_SECRET=[A-Za-z0-9]{32,}/);
    const firewall = readFileSync("scripts/configure-internal-staging-firewall.ps1", "utf8");
    expect(firewall).toContain('AllowedSubnet = "192.168.1.0/24"');
    expect(firewall).toContain("-Profile Domain,Private");
    expect(firewall).not.toContain("-RemoteAddress Any");
    const backup = readFileSync("scripts/backup-internal-staging.ps1", "utf8");
    expect(backup).toContain("--single-transaction");
    expect(backup).toContain("Get-FileHash -Algorithm SHA256");
  });
});
