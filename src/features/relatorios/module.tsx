import type { Module } from "@core/router/module.contract";
import { RelatoriosPage } from "./pages/RelatoriosPage";

const relatoriosModule: Module = {
  name: "relatorios",
  routes: [{ path: "/relatorios", element: <RelatoriosPage /> }],
  menu: {
    label: "Relatórios",
    path: "/relatorios",
    icon: "Printer",
    order: 80,
  },
};

export default relatoriosModule;
