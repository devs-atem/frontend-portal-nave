/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_PROVIDER?: "atem" | "ream";
  readonly VITE_AUTH_RULES?: string;
  readonly VITE_AUTH_ADMIN_ROLES?: string;
  readonly VITE_APP_NAME?: string;
  /** DEV ONLY: "true" injeta um usuário mock e pula o login real. */
  readonly VITE_AUTH_BYPASS?: string;
  /**
   * DEV ONLY (só com VITE_AUTH_BYPASS=true): define se o usuário mock é admin.
   * "true" (padrão) → adminMode, ignora RBAC. "false" → usuário comum,
   * sujeito aos filtros de permissão (usa VITE_AUTH_BYPASS_PERMISSIONS).
   */
  readonly VITE_AUTH_BYPASS_ADMIN?: string;
  /**
   * DEV ONLY (só com bypass não-admin): lista de permissões concedidas ao
   * usuário mock, separadas por vírgula. Ex.:
   * "portal_nave:dashboard:read,portal_nave:movements:read".
   */
  readonly VITE_AUTH_BYPASS_PERMISSIONS?: string;
  readonly VITE_APP_ENV?: "development" | "homologation" | "production";
  readonly VITE_API_URL?: string;
  readonly VITE_AUTH_URL?: string;
  readonly VITE_FLAGSMITH_ENV_ID?: string;
  readonly VITE_DATADOG_APP_ID?: string;
  readonly VITE_DATADOG_CLIENT_TOKEN?: string;
  readonly VITE_DATADOG_SERVICE?: string;
  readonly VITE_API_PROXY_TARGET?: string;
  readonly VITE_DISABLE_DATADOG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
