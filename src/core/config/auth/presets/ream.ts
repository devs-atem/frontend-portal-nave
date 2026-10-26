import type { AuthPreset } from "../types";

/**
 * Preset Ream — mw.ream.com.br/mw-auth.
 */
export const reamPreset: AuthPreset = {
  productName: import.meta.env.VITE_APP_NAME ?? "canal-cliente-ream",
  rules: import.meta.env.VITE_AUTH_RULES ?? "canal_cliente_ream",

  authApi: {
    url: {
      development: "https://mw-dev.ream.com.br/mw-auth",
      homologation: "https://mw-dev.ream.com.br/mw-auth",
      production: "https://mw.ream.com.br/mw-auth",
    },
    refreshPath: "/auth/refresh",
    timeout: 30_000,
  },

  loginSpa: {
    url: {
      development: "http://localhost:3000/#/logout",
      homologation: "https://auth-dev.ream.com.br/#/logout",
      production: "https://auth.ream.com.br/#/logout",
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
