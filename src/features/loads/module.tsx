import type { Module } from "@core/router/module.contract";
import { RelatorioCargasPage } from "./pages/LoadsReportPage";
import { CargasVolumePage } from "./pages/LoadsByVolumePage";
import { MovimentacaoPage } from "./pages/VehicleMovementPage";

const cargasModule: Module = {
  name: "cargas",
  routes: [
    { path: "/cargas/relatorio", element: <RelatorioCargasPage /> },
    { path: "/cargas/volume", element: <CargasVolumePage /> },
    { path: "/cargas/movimentacao", element: <MovimentacaoPage /> },
  ],
  menu: {
    label: "Cargas",
    icon: "ArrowUpFromLine",
    order: 50,
    children: [
      { label: "Relatório de cargas", path: "/cargas/relatorio" },
      { label: "Cargas por volume", path: "/cargas/volume" },
      { label: "Movimentação de veículos", path: "/cargas/movimentacao" },
    ],
  },
};

export default cargasModule;
