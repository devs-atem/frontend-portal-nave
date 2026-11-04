import type { ReactElement } from "react";
import type { Module } from "@core/router/module.contract";
import { RouteGuard } from "@core/router/RouteGuard";
import { generatePermissionMatcher } from "@shared/utils";
import { DescargasLotePage } from "./pages/UnloadsByBatchPage";
import { DescargasPeriodoPage } from "./pages/UnloadsByPeriodPage";

const PERM_BATCH = "portal_nave:unloads_batch:read";
const PERM_PERIOD = "portal_nave:unloads_period:read";

const guard = (perm: string, el: ReactElement) => (
  <RouteGuard rules={generatePermissionMatcher(perm)}>{el}</RouteGuard>
);

const descargasModule: Module = {
  name: "descargas",
  routes: [
    { path: "/descargas/lote", element: guard(PERM_BATCH, <DescargasLotePage />) },
    {
      path: "/descargas/periodo",
      element: guard(PERM_PERIOD, <DescargasPeriodoPage />),
    },
  ],
  menu: {
    label: "Descargas",
    icon: "ArrowDownToLine",
    order: 40,
    children: [
      {
        label: "Descargas por lote",
        path: "/descargas/lote",
        permission: PERM_BATCH,
      },
      {
        label: "Descargas por período",
        path: "/descargas/periodo",
        permission: PERM_PERIOD,
      },
    ],
  },
};

export default descargasModule;
