import type { Module } from "@core/router/module.contract";
import { MovimentosPage } from "./pages/MovimentosPage";

const movimentosModule: Module = {
  name: "movimentos",
  routes: [{ path: "/movimentos", element: <MovimentosPage /> }],
  menu: {
    label: "Movimentos",
    path: "/movimentos",
    icon: "Activity",
    order: 60,
  },
};

export default movimentosModule;
