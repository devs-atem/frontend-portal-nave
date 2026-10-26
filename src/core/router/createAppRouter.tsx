import { createHashRouter } from "react-router-dom";

import Shell from "@shared/components/Layout/Shell";
import type { Module } from "./module.contract";
import { AccessDeniedPage } from "./builtin/AccessDeniedPage";
import { NotFoundPage } from "./builtin/NotFoundPage";

/**
 * Monta o router do app a partir dos módulos descobertos.
 *
 * O layout `Shell` embrulha todas as rotas dos módulos + as built-ins
 * de sistema (`/access-denied`, `/404`). A rota catch-all também cai
 * no `NotFoundPage` dentro do Shell — mantém header/menu visíveis.
 *
 * Usamos `createHashRouter` pra funcionar em qualquer servidor estático
 * sem config de rewrite.
 */
export function createAppRouter(modules: Module[]) {
  const moduleRoutes = modules.flatMap((m) => m.routes);

  return createHashRouter([
    {
      path: "",
      element: <Shell />,
      children: [
        ...moduleRoutes,
        { path: "/access-denied", element: <AccessDeniedPage /> },
        { path: "/404", element: <NotFoundPage /> },
        { path: "*", element: <NotFoundPage /> },
      ],
    },
  ]);
}
