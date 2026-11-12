import type { Module } from "@core/router/module.contract";
import { RouteGuard } from "@core/router/RouteGuard";
import { generatePermissionMatcher } from "@shared/utils";
import { MovimentosPage } from "./pages/MovementsPage";

const PERM = "portal_nave:movements:read";

const movimentosModule: Module = {
  name: "movimentos",
  routes: [
    {
      path: "/movimentos",
      element: (
        <RouteGuard rules={generatePermissionMatcher(PERM)}>
          <MovimentosPage />
        </RouteGuard>
      ),
    },
  ],
  menu: {
    label: "Movimentos",
    path: "/movimentos",
    icon: "Activity",
    order: 60,
    permission: PERM,
  },
};

export default movimentosModule;
