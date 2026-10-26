import { atemPreset } from "./presets/atem";
import { reamPreset } from "./presets/ream";
import type { AuthEnv, AuthPreset } from "./types";

export type AuthProviderId = "atem" | "ream";

const presets: Record<AuthProviderId, AuthPreset> = {
  atem: atemPreset,
  ream: reamPreset,
};

const providerId = (import.meta.env.VITE_AUTH_PROVIDER as AuthProviderId) ?? "atem";

const base = presets[providerId] ?? atemPreset;

/** Mescla o preset base com overrides vindos do .env do projeto. */
const envAdminRoles = (import.meta.env.VITE_AUTH_ADMIN_ROLES ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const authConfig: AuthPreset = {
  ...base,
  productName: import.meta.env.VITE_APP_NAME ?? base.productName,
  rules: import.meta.env.VITE_AUTH_RULES ?? base.rules,
  permissions: {
    ...base.permissions,
    adminRoles: Array.from(
      new Set([...base.permissions.adminRoles, ...envAdminRoles]),
    ),
  },
};

export const authProvider: AuthProviderId = providerId;

/** Deriva o ambiente a partir de .env ou hostname. */
export function resolveEnv(): AuthEnv {
  const explicit = import.meta.env.VITE_APP_ENV as AuthEnv | undefined;
  if (explicit) return explicit;
  const { hostname } = window.location;
  if (hostname === "localhost" || /^127\./.test(hostname) || /^192\.168\./.test(hostname)) {
    return "development";
  }
  if (/-dev\./.test(hostname)) return "homologation";
  return "production";
}

const env = resolveEnv();

/** URL completa do endpoint de refresh (base + path). */
export const authRefreshUrl =
  (import.meta.env.VITE_AUTH_URL ?? authConfig.authApi.url[env]) +
  (authConfig.authApi.refreshPath ?? "/auth/refresh");

/** URL base do SPA de login (pra onde o logout redireciona). */
export const loginSpaUrl = authConfig.loginSpa.url[env];
