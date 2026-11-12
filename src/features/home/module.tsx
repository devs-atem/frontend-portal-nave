import type { Module } from "@core/router/module.contract";
import { HomeRedirect } from "@core/router/builtin/HomeRedirect";

/**
 * Rota raiz — redireciona para a primeira tela acessível ao usuário (RBAC).
 * Sem entrada de menu (a navegação é feita pelos módulos de negócio).
 */
const homeModule: Module = {
  name: "home",
  routes: [{ path: "/", element: <HomeRedirect /> }],
};

export default homeModule;
