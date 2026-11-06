import type { Module } from "@core/router/module.contract";
import { RouteGuard } from "@core/router/RouteGuard";
import { generatePermissionMatcher } from "@shared/utils";
import { NfePage } from "./pages/NfePage";

const PERM_NFE = "portal_nave:fiscal_nfe:read";

const fiscalModule: Module = {
  name: "fiscal",
  routes: [
    {
      path: "/fiscal/nfe",
      element: (
        <RouteGuard rules={generatePermissionMatcher(PERM_NFE)}>
          <NfePage />
        </RouteGuard>
      ),
    },
  ],
  menu: {
    label: "Fiscal",
    icon: "FileText",
    order: 30,
    children: [
      { label: "Consulta de NF-e", path: "/fiscal/nfe", permission: PERM_NFE },
    ],
  },
};

export default fiscalModule;
