import type { AuthPreset } from "../types";

/**
 * Preset Atem — Cognito via gateway.grupoatem.com.br.
 * Usado por: portal-vendas, portal-trading, portal-cliente, etc.
 */
export const atemPreset: AuthPreset = {
  productName: import.meta.env.VITE_APP_NAME ?? "portal-nave-atem",
  rules: import.meta.env.VITE_AUTH_RULES ?? "portal_nave",

  authApi: {
    url: {
      development: "https://gateway-dev.grupoatem.com.br",
      homologation: "https://gateway-dev.grupoatem.com.br",
      production: "https://gateway.grupoatem.com.br",
    },
    refreshPath: "/auth/refresh",
    timeout: 60_000,
  },

  loginSpa: {
    url: {
      development: "http://localhost:3000/#/logout",
      homologation: "https://authcog-dev.grupoatem.com.br/#/logout",
      production: "https://authcog.grupoatem.com.br/#/logout",
    },
  },

  cookie: {
    name: "refreshToken",
    sameSite: "lax",
  },

  permissions: {
    adminRoles: ["admin"],
  },

  refresh: {
    bufferMs: 59 * 60 * 1_000,
    safetyMarginMs: 30_000,
  },

  onRefreshFailure: "logout",
};
