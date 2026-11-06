import type { ReactElement } from "react";
import type { Module } from "@core/router/module.contract";
import { RouteGuard } from "@core/router/RouteGuard";
import { generatePermissionMatcher } from "@shared/utils";
import { RelatorioCargasPage } from "./pages/LoadsReportPage";
import { CargasVolumePage } from "./pages/LoadsByVolumePage";
import { MovimentacaoPage } from "./pages/VehicleMovementPage";

const PERM_REPORT = "portal_nave:loads_report:read";
const PERM_VOLUME = "portal_nave:loads_volume:read";
const PERM_MOVEMENT = "portal_nave:loads_movement:read";

const guard = (perm: string, el: ReactElement) => (
  <RouteGuard rules={generatePermissionMatcher(perm)}>{el}</RouteGuard>
);

const cargasModule: Module = {
  name: "cargas",
  routes: [
    {
      path: "/cargas/relatorio",
      element: guard(PERM_REPORT, <RelatorioCargasPage />),
    },
    { path: "/cargas/volume", element: guard(PERM_VOLUME, <CargasVolumePage />) },
    {
      path: "/cargas/movimentacao",
      element: guard(PERM_MOVEMENT, <MovimentacaoPage />),
    },
  ],
  menu: {
    label: "Cargas",
    icon: "ArrowUpFromLine",
    order: 50,
    children: [
      {
        label: "Relatório de cargas",
        path: "/cargas/relatorio",
        permission: PERM_REPORT,
      },
      {
        label: "Cargas por volume",
        path: "/cargas/volume",
        permission: PERM_VOLUME,
      },
      {
        label: "Movimentação de veículos",
        path: "/cargas/movimentacao",
        permission: PERM_MOVEMENT,
      },
    ],
  },
};

export default cargasModule;
