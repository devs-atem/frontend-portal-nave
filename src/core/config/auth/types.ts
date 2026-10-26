/**
 * Shape de configuração de um provedor de autenticação.
 * Cada preset (atem, ream, ...) implementa este contrato.
 *
 * Veja `./presets/atem.ts` e `./presets/ream.ts` para exemplos.
 */

export type AuthEnv = "development" | "homologation" | "production";

export interface AuthMeta {
  id: string;
  email: string;
  name: string;
  roles?: string[];
  permissionSet: {
    ROLES?: string[];
    SYSTEM_MODULES?: string[];
    CNPJ?: Array<{ CNPJ: string; companyName: string }>;
    CENTERS?: string[];
    PORTFOLIO_IDS?: string[];
    [key: string]: unknown;
  };
}

export interface AuthenticationResponse {
  AccessToken: string;
  ExpiresIn: number;
  TokenType: "Bearer";
  RefreshToken: string;
  meta: AuthMeta;
}

export interface AuthPreset {
  /** Nome legível, aparece em logs/Datadog. */
  productName: string;

  /** Identificador de permissão (vai no payload do logout). */
  rules: string;

  authApi: {
    url: Record<AuthEnv, string>;
    refreshPath?: string;
    timeout?: number;
    extraHeaders?: Record<string, string>;
  };

  loginSpa: {
    url: Record<AuthEnv, string>;
    /**
     * Nome dos query params do logout.
     * Default: `{ urlParam: "url", rulesParam: "rules" }`.
     *
     * O SPA de auth (Atem e Ream) sempre espera esses parâmetros em texto
     * claro na URL (ex.: `?url=https://portal&rules=portal_cliente`).
     */
    queryParams?: { urlParam: string; rulesParam: string };
  };

  cookie: {
    name?: string;
    domain?: string;
    secure?: boolean;
    sameSite?: "strict" | "lax" | "none";
  };

  permissions: {
    adminRoles: string[];
    permissionAliases?: Record<string, string>;
    extractModules?: (meta: AuthMeta) => string[];
    extractRoles?: (meta: AuthMeta) => string[];
  };

  refresh: {
    bufferMs?: number;
    safetyMarginMs?: number;
  };

  onRefreshFailure: "logout" | "silent";

  datadog?: {
    applicationId: string;
    clientToken: string;
    service: string;
    env: AuthEnv;
    enabled?: boolean;
  };
}
