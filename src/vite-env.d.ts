/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_PROVIDER?: "atem" | "ream";
  readonly VITE_AUTH_RULES?: string;
  readonly VITE_AUTH_ADMIN_ROLES?: string;
  readonly VITE_APP_NAME?: string;
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
