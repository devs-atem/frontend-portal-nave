import type { ReactElement } from "react";
import type { Module } from "@core/router/module.contract";
import { RouteGuard } from "@core/router/RouteGuard";
import { generatePermissionMatcher } from "@shared/utils";
import { SaldosTanquePage } from "./pages/BalancesByTankPage";
import { SaldosLotePage } from "./pages/BalancesByBatchPage";
import { PosicaoPage } from "./pages/TankPositionPage";
import { EstoqueOnlinePage } from "./pages/OnlineStockPage";

const PERM_TANK = "portal_nave:balances_tank:read";
const PERM_BATCH = "portal_nave:balances_batch:read";
const PERM_POSITION = "portal_nave:balances_position:read";
const PERM_ONLINE = "portal_nave:balances_online:read";

const guard = (perm: string, el: ReactElement) => (
  <RouteGuard rules={generatePermissionMatcher(perm)}>{el}</RouteGuard>
);

const saldosModule: Module = {
  name: "saldos",
  routes: [
    { path: "/saldos/tanque", element: guard(PERM_TANK, <SaldosTanquePage />) },
    { path: "/saldos/lote", element: guard(PERM_BATCH, <SaldosLotePage />) },
    { path: "/saldos/posicao", element: guard(PERM_POSITION, <PosicaoPage />) },
    {
      path: "/saldos/estoque-online",
      element: guard(PERM_ONLINE, <EstoqueOnlinePage />),
    },
  ],
  menu: {
    label: "Saldos",
    icon: "Database",
    order: 10,
    children: [
      { label: "Saldos por tanque", path: "/saldos/tanque", permission: PERM_TANK },
      { label: "Saldos por lote", path: "/saldos/lote", permission: PERM_BATCH },
      {
        label: "Posição dos tanques",
        path: "/saldos/posicao",
        permission: PERM_POSITION,
      },
      {
        label: "Estoque online",
        path: "/saldos/estoque-online",
        permission: PERM_ONLINE,
      },
    ],
  },
};

export default saldosModule;
