import { useMemo } from "react";
import flagsmith from "@flagsmith/flagsmith";

import { useAuth } from "@core/auth/AuthContext";
import { flagsmithEnabled } from "@core/config/featureFlags";
import type { MenuItem, Module } from "@core/router/module.contract";

/**
 * Agrega as entradas de menu de todos os módulos descobertos, aplica
 * ordenação por `order` e filtra por permissão/flag.
 *
 * - `adminMode` ignora qualquer filtro.
 * - `permission` casa via `authByPermission` (que já lida com wildcard).
 * - `flag` consulta o Flagsmith sync (`hasFeature`). Se o Flagsmith está
 *   desligado via `.env`, a flag é tratada como habilitada.
 * - Grupos com `children` são podados: um grupo que fica sem filhos
 *   visíveis some do menu.
 *
 * Nota: a filtragem lê o flagsmith no momento do render. Mudanças de
 * flag live só aparecem após re-render ou refresh — adequado pro menu,
 * que raramente muda em runtime.
 */
export function useMenuItems(modules: Module[]): MenuItem[] {
  const auth = useAuth();

  return useMemo(() => {
    const items = modules
      .map((m) => m.menu)
      .filter((menu): menu is MenuItem => !!menu)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return items
      .map((item) => filterItem(item, auth))
      .filter((item): item is MenuItem => item !== null);
  }, [modules, auth]);
}

function filterItem(
  item: MenuItem,
  auth: ReturnType<typeof useAuth>,
): MenuItem | null {
  if (!auth.adminMode) {
    if (item.permission && !auth.authByPermission(item.permission)) return null;
    if (item.flag && flagsmithEnabled && !flagsmith.hasFeature(item.flag)) {
      return null;
    }
  }

  if (item.children?.length) {
    const children = item.children
      .map((child) => filterItem(child, auth))
      .filter((child): child is MenuItem => child !== null);
    if (!children.length) return null;
    return { ...item, children };
  }

  return item;
}
