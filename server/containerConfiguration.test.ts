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
});
