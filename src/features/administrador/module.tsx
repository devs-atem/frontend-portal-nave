import type { Module } from "@core/router/module.contract";
import { RouteGuard } from "@core/router/RouteGuard";
import { generatePermissionMatcher } from "@shared/utils";
import { AdminPage } from "@features/admin/pages/AdminPage";
import { ClientRegistrationPage } from "@features/client-registration/pages/ClientRegistrationPage";
import type { IClientRegistrationService } from "@features/client-registration/services/ClientRegistrationService";
import { MockClientRegistrationService } from "@features/client-registration/services/MockClientRegistrationService";
// import { ClientRegistrationService } from "@features/client-registration/services/ClientRegistrationService";

/**
 * Módulo pai "Administrador".
 *
 * Agrupa, sob um único item de menu com `children`, as áreas administrativas:
 * - Cadastro de clientes (`/registrations/clients`)
 * - Administração (`/admin`)
 *
 * As rotas e o registro de service que antes viviam nos módulos
 * `admin` e `client-registration` foram centralizados aqui. Aqueles
 * módulos agora são invisíveis (sem menu/rotas) pra evitar duplicação
 * na sidebar e no router.
 */
declare module "@core/ioc/registry" {
  interface AppServices {
    clientRegistration: IClientRegistrationService;
  }
}

const CLIENT_REGISTRY_PERMISSION = "portal_nave:client_registry:read";
const ADMIN_PERMISSION = "portal_nave:admin:read";

const administradorModule: Module = {
  name: "administrador",
  routes: [
    {
      path: "/registrations/clients",
      element: (
        <RouteGuard rules={generatePermissionMatcher(CLIENT_REGISTRY_PERMISSION)}>
          <ClientRegistrationPage />
        </RouteGuard>
      ),
    },
    {
      path: "/admin",
      element: (
        <RouteGuard rules={generatePermissionMatcher(ADMIN_PERMISSION)}>
          <AdminPage />
        </RouteGuard>
      ),
    },
  ],
  menu: {
    label: "Administrador",
    icon: "Settings",
    order: 85,
    children: [
      {
        label: "Cadastro de clientes",
        path: "/registrations/clients",
        icon: "Users",
        order: 10,
        permission: CLIENT_REGISTRY_PERMISSION,
      },
      {
        label: "Administração",
        path: "/admin",
        icon: "Settings",
        order: 20,
        permission: ADMIN_PERMISSION,
      },
    ],
  },
  // TEMPORÁRIO: mock enquanto a API /rest/clients está instável no mw-nave-dev.
  // Para voltar à API real: descomentar o import de `ClientRegistrationService`
  // e a linha abaixo, e remover o mock.
  // services: (c) =>
  //   c.add({ clientRegistration: new ClientRegistrationService(c.get("http")) }),
  services: (c) => c.add({ clientRegistration: new MockClientRegistrationService() }),
};

export default administradorModule;
