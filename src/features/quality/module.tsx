import type { Module } from "@core/router/module.contract";
import { RouteGuard } from "@core/router/RouteGuard";
import { generatePermissionMatcher } from "@shared/utils";
import { DensidadesPage } from "./pages/DensitiesPage";

const PERM_DENSITY = "portal_nave:quality_density:read";

const qualidadeModule: Module = {
  name: "qualidade",
  routes: [
    {
      path: "/qualidade/densidades",
      element: (
        <RouteGuard rules={generatePermissionMatcher(PERM_DENSITY)}>
          <DensidadesPage />
        </RouteGuard>
      ),
    },
  ],
  menu: {
    label: "Qualidade",
    icon: "FlaskConical",
    order: 70,
    children: [
      {
        label: "Densidades do tanque",
        path: "/qualidade/densidades",
        permission: PERM_DENSITY,
      },
    ],
  },
};

export default qualidadeModule;
