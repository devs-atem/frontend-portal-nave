import type { ReactElement } from "react";
import type { Module } from "@core/router/module.contract";
import { RouteGuard } from "@core/router/RouteGuard";
import { generatePermissionMatcher } from "@shared/utils";
import { ContractDetailPage } from "./pages/ContractDetailPage";
import { ContractFormPage } from "./pages/ContractFormPage";
import { ContractsPage } from "./pages/ContractsPage";
import { CONTRACT_PERM } from "./permissions";
import { ContractsService, type IContractsService } from "./services/ContractsService";
import { OwnersService, type IOwnersService } from "./services/OwnersService";
import { ReferenceService, type IReferenceService } from "./services/ReferenceService";

/**
 * Módulo "Contratos" — contratos de custódia integrados ao mw-nave
 * (`/rest/contracts`, `/rest/owners`, catálogo operacional e pools).
 *
 * Acesso restrito ao perfil Gestor de contratos (`nave_gestor_contratos`) e ao
 * admin (bypass). O grupo `nave_cliente` NÃO recebe nenhuma permissão de
 * contratos. Leitura: `contracts:read`; criar/editar/revisar: `contracts:write`;
 * aprovar: `contracts:approve`; mudar status: `contracts:status`.
 */
declare module "@core/ioc/registry" {
  interface AppServices {
    contracts: IContractsService;
    owners: IOwnersService;
    contractsReference: IReferenceService;
  }
}

const guard = (perm: string, element: ReactElement) => (
  <RouteGuard rules={generatePermissionMatcher(perm)}>{element}</RouteGuard>
);

const contractsModule: Module = {
  name: "contracts",
  routes: [
    { path: "/contratos", element: guard(CONTRACT_PERM.read, <ContractsPage />) },
    { path: "/contratos/novo", element: guard(CONTRACT_PERM.write, <ContractFormPage mode="create" />) },
    { path: "/contratos/:id", element: guard(CONTRACT_PERM.read, <ContractDetailPage />) },
    { path: "/contratos/:id/editar", element: guard(CONTRACT_PERM.write, <ContractFormPage mode="edit" />) },
    {
      path: "/contratos/:id/nova-revisao",
      element: guard(CONTRACT_PERM.write, <ContractFormPage mode="revision" />),
    },
  ],
  menu: {
    label: "Contratos",
    path: "/contratos",
    icon: "FileText",
    order: 82,
    permission: CONTRACT_PERM.read,
  },
  services: (c) =>
    c.add({
      contracts: new ContractsService(c.get("http")),
      owners: new OwnersService(c.get("http")),
      contractsReference: new ReferenceService(c.get("http")),
    }),
};

export default contractsModule;
