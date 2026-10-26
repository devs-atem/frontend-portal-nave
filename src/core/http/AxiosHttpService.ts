import Axios, { AxiosError, type AxiosInstance } from "axios";

import appConfig from "@core/config/appConfig";
import AppError from "@shared/utils/appError";
import type {
  IAxiosErrorPayload,
  IHttpService,
} from "@core/http/models/IHttpService";

/** Rota builtin do core/router pra 403 redirect. */
const ACCESS_DENIED_PATH = "/access-denied";

export default class AxiosHttpService implements IHttpService {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = Axios.create({
      timeout: appConfig.api.timeout,
      baseURL: appConfig.api.url,
    });
  }

  setAuthorization(token: string): void {
    this.http.defaults.headers.common.Authorization = token;
  }

  getAuthorization(): string {
    return String(this.http.defaults.headers.common.Authorization ?? "");
  }

  setTokenExpirationStrategy(strategy: () => Promise<string | null>): void {
    this.http.interceptors.request.clear();
    this.http.interceptors.request.use(async (config) => {
      const newToken = await strategy();
      if (newToken) {
        this.setAuthorization(newToken);
        config.headers.Authorization = newToken;
      }
      return config;
    });
  }

  private async request<T>(
    method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
    params?: unknown,
    responseType?: string,
    signal?: AbortSignal,
  ): Promise<T> {
    try {
      const { data } = await this.http.request<T>({
        method,
        url: path,
        data: body,
        params: params as Record<string, unknown>,
        responseType: responseType as never,
        signal,
      });
      return data;
    } catch (err) {
      const axiosError = err as AxiosError<IAxiosErrorPayload>;
      const resp = axiosError.response;

      // 403 → redireciona pro /access-denied (built-in)
      if (resp?.status === 403) {
        const target = `${ACCESS_DENIED_PATH}?reason=forbidden`;
        if (!window.location.hash.startsWith(`#${ACCESS_DENIED_PATH}`)) {
          window.location.hash = target;
        }
        return new Promise<never>(() => {});
      }

      if (resp) {
        const payload = resp.data ?? {};
        throw new AppError(
          payload.message ?? axiosError.message ?? "Erro na requisição",
          "error",
          payload.name,
          payload.status ?? resp.status,
          payload.errors,
        );
      }

      throw new AppError(
        `Não foi possível realizar a operação: ${axiosError.message}`,
        "error",
      );
    }
  }

  get<T>(path: string, params?: unknown) {
    return this.request<T>("GET", path, undefined, params);
  }
  post<T>(
    path: string,
    body?: unknown,
    params?: unknown,
    responseType?: string,
    signal?: AbortSignal,
  ) {
    return this.request<T>("POST", path, body, params, responseType, signal);
  }
  patch<T>(path: string, body?: unknown, params?: unknown) {
    return this.request<T>("PATCH", path, body, params);
  }
  put<T>(path: string, body?: unknown, params?: unknown) {
    return this.request<T>("PUT", path, body, params);
  }
  delete<T>(path: string, params?: unknown) {
    return this.request<T>("DELETE", path, undefined, params);
  }
}
