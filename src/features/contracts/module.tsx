import type { Module } from "@core/router/module.contract";
import { RouteGuard } from "@core/router/RouteGuard";
import { generatePermissionMatcher } from "@shared/utils";
import { ContractsPage } from "./pages/ContractsPage";

/**
 * Módulo "Contratos" — parâmetros contratuais de armazenagem.
 * Acessível ao perfil Gestor de contratos (e admin).
 */
const PERM = "portal_nave:contracts:read";

const contractsModule: Module = {
  name: "contracts",
  routes: [
    {
      path: "/contratos",
      element: (
        <RouteGuard rules={generatePermissionMatcher(PERM)}>
          <ContractsPage />
        </RouteGuard>
      ),
    },
  ],
  menu: {
    label: "Contratos",
    path: "/contratos",
    icon: "FileText",
    order: 82,
    permission: PERM,
  },
};

export default contractsModule;
