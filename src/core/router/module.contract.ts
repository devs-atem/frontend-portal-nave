import type { IconName } from "@devs-atem/design-system";
import type { RouteObject } from "react-router-dom";
import type { AppServices } from "@core/ioc/registry";

/**
 * Entrada de menu de um módulo (ou de um dos seus filhos).
 *
 * - `path` é opcional em grupos (quando `children` está presente).
 * - `permission` casa com `permissionSet.SYSTEM_MODULES` via wildcard.
 * - `flag` é consultado no Flagsmith (quando habilitado).
 */
export interface MenuItem {
  label: string;
  path?: string;
  icon?: IconName;
  order?: number;
  permission?: string;
  flag?: string;
  children?: MenuItem[];
}

/**
 * Container de IoC mínimo que o `services` callback de um módulo recebe.
 *
 * Tipado em cima de `AppServices` (que cresce via declaration merging em
 * cada feature). Expõe apenas o essencial: `get` pra resolver deps e `add`
 * pra devolver um novo container com services registrados.
 *
 * Em runtime é um container `iti`; o shape mínimo aqui evita acoplar o
 * contrato do módulo à API inteira do `iti`.
 */
export interface ModuleIoCContainer {
  get<K extends keyof AppServices>(key: K): AppServices[K];
  add(services: Partial<AppServices>): ModuleIoCContainer;
}

/**
 * Contrato de um módulo (feature auto-contida).
 *
 * Cada arquivo `src/features/<name>/module.tsx` deve `export default` um
 * objeto que satisfaça esse shape. A descoberta é feita por
 * `@core/router/modules` via `import.meta.glob`.
 */
export interface Module {
  /** Identificador curto. Usado em logs e como key. */
  name: string;
  /** Rotas registradas pelo módulo. Entrada direta no React Router. */
  routes: RouteObject[];
  /** Entrada de menu. Omita pra features invisíveis. */
  menu?: MenuItem;
  /**
   * Registra services da feature no container IoC. Opcional — módulos sem
   * services (ex: puramente de UI) omitem.
   *
   * O callback recebe o container "em progresso" (já com os services base
   * registrados pelo core) e deve retornar um container com os services
   * da feature `.add({ ... })`.
   *
   * Pra que `useIoC("meuService")` tenha autocomplete, aumente a interface
   * `AppServices` em `@core/ioc/registry` via declaration merging dentro
   * do próprio `module.tsx`.
   */
  services?: (container: ModuleIoCContainer) => ModuleIoCContainer;
}
