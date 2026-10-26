import type { IHttpService } from "@core/http/models/IHttpService";
import type { AuthService } from "@core/services/AuthService";

/**
 * Registry global dos services do app.
 *
 * O core registra `http` e `auth` por padrão. Cada feature que precisa
 * adicionar um service **aumenta esta interface** no próprio `module.tsx`
 * via *declaration merging*, e implementa o campo `services` do `Module`
 * pra registrar a instância no container.
 *
 * Exemplo (dentro de uma feature):
 *
 * ```tsx
 * // src/features/financeiro/module.tsx
 * declare module "@core/ioc/registry" {
 *   interface AppServices {
 *     financeiro: FinanceiroService;
 *   }
 * }
 *
 * const financeiroModule: Module = {
 *   name: "financeiro",
 *   routes: [...],
 *   services: (c) =>
 *     c.add({ financeiro: new FinanceiroService(c.get("http")) }),
 * };
 * ```
 *
 * Com isso o `useIoC("financeiro")` passa a ter autocomplete em todo o app
 * sem editar nenhum registry central.
 */
export interface AppServices {
  http: IHttpService;
  auth: AuthService;
}
