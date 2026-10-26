import { Navigate } from "react-router-dom";

import type { Module } from "@core/router/module.contract";

/**
 * Rota raiz — redireciona para o dashboard `/inicio`.
 * Sem entrada de menu (a navegação é feita pelos módulos de negócio).
 */
const homeModule: Module = {
  name: "home",
  routes: [{ path: "/", element: <Navigate to="/inicio" replace /> }],
};

export default homeModule;
