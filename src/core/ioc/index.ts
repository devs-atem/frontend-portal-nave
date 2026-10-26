import { createContainer } from "iti";

import AxiosHttpService from "@core/http/AxiosHttpService";
import { AuthService } from "@core/services/AuthService";
import type {
  Module,
  ModuleIoCContainer,
} from "@core/router/module.contract";
import type { AppServices } from "./registry";

// ─── Pontes de tipo pro iti ──────────────────────────────────────────────
//
// A API pública do `iti` é mais rica do que o shape mínimo que expomos
// aqui (chaining tipado com generics variádicos). Centralizar os casts
// nesses helpers evita espalhar `as unknown as` pelo módulo e deixa
// óbvio onde o type system foi contornado de propósito. Se o `iti`
// mudar a API no futuro, só esses dois helpers precisam de ajuste.

/** Ponte: container cru do `iti` → shape mínimo que os módulos consomem. */
function asModuleContainer(c: unknown): ModuleIoCContainer {
  return c as ModuleIoCContainer;
}

/** Ponte: `ModuleIoCContainer` → container tipado em cima de `AppServices`. */
interface TypedAppContainer {
  get<K extends keyof AppServices>(key: K): AppServices[K];
  items: AppServices;
}
function asTypedAppContainer(c: ModuleIoCContainer): TypedAppContainer {
  return c as unknown as TypedAppContainer;
}

// ─── Factory ─────────────────────────────────────────────────────────────

/**
 * Cria uma instância isolada do container do app.
 *
 * **Composição em duas etapas:**
 *
 * 1. Nasce já com os services base (`http`, `auth`) registrados pelo core.
 * 2. `register(mods)` aplica os callbacks `services` dos módulos descobertos.
 *
 * A separação em duas etapas evita o ciclo de imports (`module.tsx` de uma
 * feature importa componentes que usam `useIoC`, que importa este módulo).
 * Com a inicialização explícita no `main.tsx`, o container nunca é
 * "consumido" durante o load dos módulos.
 *
 * **Ordem de aplicação:** segue a ordem passada em `register(mods)` — na
 * prática a ordem de descoberta do `import.meta.glob` (alfabética do path).
 * Services de feature não devem depender de outros services de feature —
 * só dos services do core (`http`, `auth`).
 *
 * **Testes:** essa factory existe pra os testes conseguirem containers
 * isolados em vez de depender do singleton global exportado logo abaixo.
 */
export function createAppContainer() {
  let c: ModuleIoCContainer = asModuleContainer(
    createContainer().add({
      http: new AxiosHttpService(),
      auth: new AuthService(),
    }),
  );

  return {
    /** Aplica os callbacks `services` de cada módulo passado. */
    register(mods: readonly Module[]): void {
      for (const mod of mods) {
        if (mod.services) {
          c = mod.services(c);
        }
      }
    },
    get<K extends keyof AppServices>(key: K): AppServices[K] {
      return asTypedAppContainer(c).get(key);
    },
    get items(): AppServices {
      return asTypedAppContainer(c).items;
    },
  };
}

// ─── Singleton do app ────────────────────────────────────────────────────

const appInstance = createAppContainer();

/**
 * Aplica os callbacks `services` dos módulos ao container do app.
 * Chamada única no `main.tsx`, antes do primeiro render.
 */
export function registerModuleServices(mods: readonly Module[]): void {
  appInstance.register(mods);
}

/**
 * Container pronto pra consumo. Em runtime é um container `iti` completo;
 * aqui exposto apenas pelos pontos essenciais, tipados em cima de
 * `AppServices` (aumentada por cada feature via declaration merging).
 */
export const appContainer = {
  get<K extends keyof AppServices>(key: K): AppServices[K] {
    return appInstance.get(key);
  },
  get items(): AppServices {
    return appInstance.items;
  },
};

/** Union dos keys registrados. Mantido pra compat com código legado. */
export type AppContainerKeys = keyof AppServices;
