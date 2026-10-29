import type { Module } from "@core/router/module.contract";
import { SaldosTanquePage } from "./pages/BalancesByTankPage";
import { SaldosLotePage } from "./pages/BalancesByBatchPage";
import { PosicaoPage } from "./pages/TankPositionPage";
import { EstoqueOnlinePage } from "./pages/OnlineStockPage";

const saldosModule: Module = {
  name: "saldos",
  routes: [
    { path: "/saldos/tanque", element: <SaldosTanquePage /> },
    { path: "/saldos/lote", element: <SaldosLotePage /> },
    { path: "/saldos/posicao", element: <PosicaoPage /> },
    { path: "/saldos/estoque-online", element: <EstoqueOnlinePage /> },
  ],
  menu: {
    label: "Saldos",
    icon: "Database",
    order: 10,
    children: [
      { label: "Saldos por tanque", path: "/saldos/tanque" },
      { label: "Saldos por lote", path: "/saldos/lote" },
      { label: "Posição dos tanques", path: "/saldos/posicao" },
      { label: "Estoque online", path: "/saldos/estoque-online" },
    ],
  },
};

export default saldosModule;
