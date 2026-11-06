import { authConfig, resolveEnv } from "./auth";

const { hostname } = window.location;

const LOCALHOST = "localhost";
const LOCALHOSTIP = "127.0.0.1";
const LOCAL_IP = (s: string) => /^192\.168\.\d{1,3}\.\d{1,3}$/.test(s);

export const isLocalHost = (s: string): boolean =>
  s === LOCALHOST || s === LOCALHOSTIP || LOCAL_IP(s);

const currentDomain = hostname.replace(/^[^.]+\./, "");
const cookieHost = isLocalHost(hostname) ? hostname : `.${currentDomain}`;

export const isDevelopment =
  import.meta.env.VITE_APP_ENV === "development" ||
  (import.meta.env.DEV && !import.meta.env.VITE_APP_ENV);

const env = resolveEnv();

/**
 * URL default da API de negócio (mw-nave) por ambiente — apenas o host; os
 * endpoints já incluem o prefixo `/rest`. Produto pode sobrescrever via
 * VITE_API_URL.
 */
const defaultApiUrl: Record<ReturnType<typeof resolveEnv>, string> = {
  development: "https://mw-nave-dev.grupoatem.com.br",
  homologation: "https://mw-nave-dev.grupoatem.com.br",
  // TODO: confirmar a URL de produção do mw-nave.
  production: "https://mw-nave.grupoatem.com.br",
};

const appConfig = {
  app: {
    name: authConfig.productName,
  },
  api: {
    // Proxy do Vite ativo (só em dev) → baseURL relativa, para o /rest passar
    // pelo proxy. Senão: `||` (e não `??`), pois o deploy injeta
    // VITE_API_URL="" quando não informado.
    url:
      import.meta.env.DEV && import.meta.env.VITE_API_PROXY_TARGET
        ? ""
        : import.meta.env.VITE_API_URL || defaultApiUrl[env],
    timeout: 60_000,
  },
  host: cookieHost,
  env,
};

export default appConfig;
