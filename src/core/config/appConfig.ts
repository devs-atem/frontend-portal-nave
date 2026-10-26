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

/** URL default da API de negócio por ambiente. Produto pode sobrescrever via VITE_API_URL. */
const defaultApiUrl: Record<ReturnType<typeof resolveEnv>, string> = {
  development: "https://middleware-dev.grupoatem.com.br/rest",
  homologation: "https://middleware-dev.grupoatem.com.br/rest",
  production: "https://middleware.grupoatem.com.br/rest",
};

const appConfig = {
  app: {
    name: authConfig.productName,
  },
  api: {
    url: import.meta.env.VITE_API_URL ?? defaultApiUrl[env],
    timeout: 60_000,
  },
  host: cookieHost,
  env,
};

export default appConfig;
