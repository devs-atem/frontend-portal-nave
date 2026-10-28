import type { Module } from "@core/router/module.contract";
import { PerfilPage } from "./pages/PerfilPage";

/**
 * Módulo Perfil — página "Meu perfil".
 *
 * Sem entrada de menu: é acessado pelo dropdown do usuário na AppBar
 * (rota `/perfil`).
 */
const perfilModule: Module = {
  name: "perfil",
  routes: [{ path: "/perfil", element: <PerfilPage /> }],
};

export default perfilModule;
