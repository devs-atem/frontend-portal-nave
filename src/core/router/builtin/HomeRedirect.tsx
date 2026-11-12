import { Navigate } from "react-router-dom";

import { useMenuItems } from "@shared/hooks/useMenuItems";
import { modules } from "@core/router/modules";
import type { MenuItem } from "@core/router/module.contract";

/** Primeira rota navegável (folha com `path`) do menu já filtrado por RBAC. */
function findFirstPath(items: MenuItem[]): string | null {
  for (const item of items) {
    if (item.children?.length) {
      const found = findFirstPath(item.children);
      if (found) return found;
    } else if (item.path) {
      return item.path;
    }
  }
  return null;
}

/**
 * Rota raiz (`/`): leva o usuário à primeira tela que ele pode acessar.
 *
 * Antes redirecionava sempre para `/inicio`, o que mandava para
 * `/access-denied` quem não tem `portal_nave:dashboard:read` mesmo tendo
 * acesso a outros módulos.
 */
export const HomeRedirect = () => {
  const items = useMenuItems(modules);
  const target = findFirstPath(items) ?? "/access-denied";
  return <Navigate to={target} replace />;
};
