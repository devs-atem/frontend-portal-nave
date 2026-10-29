import type { Module } from "@core/router/module.contract";
import { DensidadesPage } from "./pages/DensitiesPage";

const qualidadeModule: Module = {
  name: "qualidade",
  routes: [{ path: "/qualidade/densidades", element: <DensidadesPage /> }],
  menu: {
    label: "Qualidade",
    icon: "FlaskConical",
    order: 70,
    children: [{ label: "Densidades do tanque", path: "/qualidade/densidades" }],
  },
};

export default qualidadeModule;
