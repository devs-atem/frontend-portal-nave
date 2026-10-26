export interface IHttpService {
  setAuthorization(token: string): void;
  setTokenExpirationStrategy(strategy: () => Promise<string | null>): void;
  getAuthorization(): string;

  get<T = unknown>(path: string, params?: unknown): Promise<T>;
  post<T = unknown>(
    path: string,
    body?: unknown,
    params?: unknown,
    responseType?: string,
    signal?: AbortSignal,
  ): Promise<T>;
  patch<T = unknown>(path: string, body?: unknown, params?: unknown): Promise<T>;
  put<T = unknown>(path: string, body?: unknown, params?: unknown): Promise<T>;
  delete<T = unknown>(path: string, params?: unknown): Promise<T>;
}

export interface IAxiosErrorPayload {
  message?: string;
  name?: string;
  status?: number;
  errors?: unknown[];
}
