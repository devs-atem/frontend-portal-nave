import { appContainer } from "@core/ioc";
import type { AppServices } from "@core/ioc/registry";

/**
 * Resolve um service do container pelo nome.
 * Tipagem: a chave é um union dos keys registrados em `AppServices`
 * (interface aumentada por cada feature via declaration merging).
 *
 * ```ts
 * const http = useIoC("http");            // tipado como IHttpService
 * const auth = useIoC("auth");            // tipado como AuthService
 * // após uma feature declarar aumento:
 * const financeiro = useIoC("financeiro"); // tipado como FinanceiroService
 * ```
 */
export function useIoC<K extends keyof AppServices>(key: K): AppServices[K] {
  const service = appContainer.get(key);
  if (!service) {
    throw new Error(`[useIoC] Service não encontrado: ${String(key)}`);
  }
  return service;
}
