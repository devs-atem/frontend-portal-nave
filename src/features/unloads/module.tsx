import type { Module } from "@core/router/module.contract";
import { DescargasLotePage } from "./pages/UnloadsByBatchPage";
import { DescargasPeriodoPage } from "./pages/UnloadsByPeriodPage";

const descargasModule: Module = {
  name: "descargas",
  routes: [
    { path: "/descargas/lote", element: <DescargasLotePage /> },
    { path: "/descargas/periodo", element: <DescargasPeriodoPage /> },
  ],
  menu: {
    label: "Descargas",
    icon: "ArrowDownToLine",
    order: 40,
    children: [
      { label: "Descargas por lote", path: "/descargas/lote" },
      { label: "Descargas por período", path: "/descargas/periodo" },
    ],
  },
};

export default descargasModule;
