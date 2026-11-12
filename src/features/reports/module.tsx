import type { Module } from "@core/router/module.contract";
import { RouteGuard } from "@core/router/RouteGuard";
import { generatePermissionMatcher } from "@shared/utils";
import { RelatoriosPage } from "./pages/RelatoriosPage";

const PERM = "portal_nave:reports:read";

const relatoriosModule: Module = {
  name: "relatorios",
  routes: [
    {
      path: "/relatorios",
      element: (
        <RouteGuard rules={generatePermissionMatcher(PERM)}>
          <RelatoriosPage />
        </RouteGuard>
      ),
    },
  ],
  menu: {
    label: "Relatórios",
    path: "/relatorios",
    icon: "Printer",
    order: 80,
    permission: PERM,
  },
};

export default relatoriosModule;
