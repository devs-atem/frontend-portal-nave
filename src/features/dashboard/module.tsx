import type { Module } from "@core/router/module.contract";
import { RouteGuard } from "@core/router/RouteGuard";
import { generatePermissionMatcher } from "@shared/utils";
import { InicioPage } from "./pages/HomePage";
import { ArmazenagemService } from "./services/ArmazenagemService";

/**
 * Módulo Início — dashboard do portal.
 *
 * Registra o `ArmazenagemService` (mock) no container IoC. Como o IoC aplica os
 * `services` de todos os módulos no boot, qualquer feature pode resolver o
 * service via `useIoC("armazenagem")`.
 */
declare module "@core/ioc/registry" {
  interface AppServices {
    armazenagem: ArmazenagemService;
  }
}

const PERM = "portal_nave:dashboard:read";

const inicioModule: Module = {
  name: "inicio",
  routes: [
    {
      path: "/inicio",
      element: (
        <RouteGuard rules={generatePermissionMatcher(PERM)}>
          <InicioPage />
        </RouteGuard>
      ),
    },
  ],
  menu: {
    label: "Início",
    path: "/inicio",
    icon: "LayoutDashboard",
    order: 0,
    permission: PERM,
  },
  services: (c) => c.add({ armazenagem: new ArmazenagemService() }),
};

export default inicioModule;
