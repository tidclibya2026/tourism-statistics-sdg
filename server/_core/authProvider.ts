import axios from "axios";
import { decodeOAuthState } from "@shared/const";
import type { Request } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { ENV } from "./env";
import { sdk, type AuthenticatedUser } from "./sdk";

export type AuthProviderName = "manus" | "oidc";

export type IdentityProfile = {
  subject: string;
  name: string;
  email: string | null;
  loginMethod: string;
};

export interface AuthProvider {
  readonly name: AuthProviderName;
  exchangeCode(code: string, state: string): Promise<unknown>;
  resolveIdentity(token: unknown): Promise<IdentityProfile>;
  authenticateRequest(req: Request): Promise<AuthenticatedUser>;
}

const manusProvider: AuthProvider = {
  name: "manus",
  exchangeCode: (code, state) => sdk.exchangeCodeForToken(code, state),
  async resolveIdentity(token) {
    const accessToken = (token as { accessToken?: unknown }).accessToken;
    if (typeof accessToken !== "string" || !accessToken) {
      throw new Error("Manus token response is missing accessToken");
    }
    const user = await sdk.getUserInfo(accessToken);
    return {
      subject: user.openId,
      name: user.name || "",
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? user.platform ?? "manus",
    };
  },
  authenticateRequest: req => sdk.authenticateRequest(req),
};

const oidcProvider: AuthProvider = {
  name: "oidc",
  async exchangeCode(code, state) {
    const oauthState = decodeOAuthState(state);
    const redirectUri = oauthState.redirectUri;
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: ENV.appId,
      client_secret: ENV.authClientSecret,
      redirect_uri: redirectUri,
    });
    const { data } = await axios.post(ENV.oidcTokenUrl, body.toString(), {
      headers: { "content-type": "application/x-www-form-urlencoded" },
      timeout: 30_000,
    });
    return { ...data, expected_nonce: oauthState.nonce };
  },
  async resolveIdentity(token) {
    const response = token as {
      id_token?: unknown;
      access_token?: unknown;
      expected_nonce?: unknown;
    };
    if (typeof response.id_token !== "string" || !response.id_token) {
      throw new Error("OIDC token response is missing id_token");
    }
    const jwks = createRemoteJWKSet(new URL(ENV.oidcJwksUrl));
    const { payload } = await jwtVerify(response.id_token, jwks, {
      issuer: ENV.oidcIssuerUrl,
      audience: ENV.appId,
      algorithms: ["RS256", "ES256"],
    });
    if (typeof payload.sub !== "string" || !payload.sub) {
      throw new Error("OIDC identity is missing sub");
    }
    if (
      typeof response.expected_nonce !== "string" ||
      !response.expected_nonce ||
      payload.nonce !== response.expected_nonce
    ) {
      throw new Error("OIDC identity nonce mismatch");
    }

    let claims: Record<string, unknown> = payload;
    if (
      ENV.oidcUserInfoUrl &&
      typeof response.access_token === "string" &&
      response.access_token
    ) {
      const { data } = await axios.get(ENV.oidcUserInfoUrl, {
        headers: { authorization: `Bearer ${response.access_token}` },
        timeout: 30_000,
      });
      if (data && typeof data === "object") claims = { ...claims, ...data };
    }

    const name =
      typeof claims.name === "string"
        ? claims.name
        : typeof claims.preferred_username === "string"
          ? claims.preferred_username
          : payload.sub;
    return {
      subject: `oidc:${payload.sub}`,
      name,
      email: typeof claims.email === "string" ? claims.email : null,
      loginMethod: "oidc",
    };
  },
  authenticateRequest: req => sdk.authenticateRequest(req),
};

export function normalizeAuthProvider(value: string | undefined): AuthProviderName {
  return value?.trim().toLowerCase() === "oidc" ? "oidc" : "manus";
}

export function getAuthProvider(
  name: AuthProviderName = normalizeAuthProvider(ENV.authProvider)
): AuthProvider {
  return name === "oidc" ? oidcProvider : manusProvider;
}
