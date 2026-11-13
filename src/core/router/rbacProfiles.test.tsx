import { describe, it, expect, vi, beforeEach } from "vitest";
import { isValidElement, type ReactElement } from "react";
import { renderHook } from "@testing-library/react";

import type { MenuItem } from "@core/router/module.contract";

/**
 * Regressão do modelo de acesso por perfil (`docs/rbac-portal-nave.md`)
 * sobre os módulos REAIS do portal: o que cada grupo vê no menu e quais
 * rotas o `RouteGuard` libera.
 */

// ─── Perfis (espelham docs/rbac-portal-nave.md) ───────────────────────────

const GESTOR_CONTRATOS = [
  "portal_nave:contracts:read",
  "portal_nave:contracts:write",
  "portal_nave:contracts:approve",
  "portal_nave:contracts:status",
];

const CLIENTE = [
  "portal_nave:dashboard:read",
  "portal_nave:products:read",
  "portal_nave:balances_tank:read",
  "portal_nave:balances_batch:read",
  "portal_nave:balances_position:read",
  "portal_nave:balances_online:read",
  "portal_nave:vehicles:read",
  "portal_nave:schedules:read",
  "portal_nave:schedules:write",
  "portal_nave:fiscal_nfe:read",
  "portal_nave:unloads_batch:read",
  "portal_nave:unloads_period:read",
  "portal_nave:loads_report:read",
  "portal_nave:loads_volume:read",
  "portal_nave:loads_movement:read",
  "portal_nave:movements:read",
  "portal_nave:quality_density:read",
  "portal_nave:reports:read",
];

// ─── Mocks ───────────────────────────────────────────────────────────────

const mockAuth = {
  adminMode: false,
  permissionSet: { SYSTEM_MODULES: [] as string[] },
  authByPermission: (perm: string) =>
    mockAuth.permissionSet.SYSTEM_MODULES.includes(perm),
};

vi.mock("@core/auth/AuthContext", () => ({ useAuth: () => mockAuth }));
// Flags desligadas: o acesso depende só das permissões.
vi.mock("@core/config/featureFlags", () => ({ flagsmithEnabled: false }));
vi.mock("@flagsmith/flagsmith", () => ({ default: { hasFeature: () => true } }));

// Precisa vir depois dos mocks pra respeitar o hoisting do vi.mock
import { modules } from "@core/router/modules";
import { RouteGuard } from "@core/router/RouteGuard";
import { useMenuItems } from "@shared/hooks/useMenuItems";

// ─── Helpers ─────────────────────────────────────────────────────────────

const as = (perms: string[], admin = false) => {
  mockAuth.adminMode = admin;
  mockAuth.permissionSet.SYSTEM_MODULES = perms;
};

/** Caminhos navegáveis (folhas) do menu filtrado. */
const menuPaths = (items: MenuItem[]): string[] =>
  items.flatMap((i) => (i.children?.length ? menuPaths(i.children) : i.path ? [i.path] : []));

const visibleMenu = () => {
  const { result } = renderHook(() => useMenuItems(modules));
  return menuPaths(result.current);
};

/** Rotas que o `RouteGuard` libera (mesma regra do componente). */
const allowedRoutes = () =>
  modules
    .flatMap((m) => m.routes)
    .filter((r) => {
      const el = r.element as ReactElement<{ rules?: (p: string) => boolean }>;
      if (!isValidElement(el) || el.type !== RouteGuard) return true; // sem guard
      if (mockAuth.adminMode) return true;
      const { rules } = el.props;
      return !rules || mockAuth.permissionSet.SYSTEM_MODULES.some(rules);
    })
    .map((r) => r.path ?? "");

// Rotas sem guard por desenho: redirect da raiz e "Meu perfil".
const PUBLIC_ROUTES = ["/", "/perfil"];

// ─── Testes ──────────────────────────────────────────────────────────────

describe("RBAC por perfil (módulos reais)", () => {
  beforeEach(() => as([]));

  it("só as rotas públicas ficam sem guard", () => {
    as([]);
    expect(allowedRoutes().sort()).toEqual([...PUBLIC_ROUTES].sort());
  });

  describe("gestor de contratos (nave_gestor_contratos)", () => {
    beforeEach(() => as(GESTOR_CONTRATOS));

    it("vê no menu apenas Contratos", () => {
      expect(visibleMenu()).toEqual(["/contratos"]);
    });

    it("acessa apenas as rotas de contratos (além das públicas)", () => {
      const privateRoutes = allowedRoutes().filter((p) => !PUBLIC_ROUTES.includes(p));
      expect(privateRoutes.length).toBeGreaterThan(0);
      expect(privateRoutes.every((p) => p.startsWith("/contratos"))).toBe(true);
    });
  });

  describe("cliente (nave_cliente)", () => {
    beforeEach(() => as(CLIENTE));

    it("não vê Contratos nem a área Administrador", () => {
      const paths = visibleMenu();
      expect(paths.length).toBeGreaterThan(0);
      expect(paths.some((p) => p.startsWith("/contratos"))).toBe(false);
      expect(paths).not.toContain("/registrations/clients");
      expect(paths).not.toContain("/admin");
    });

    it("não acessa nenhuma rota de contratos", () => {
      expect(allowedRoutes().some((p) => p.startsWith("/contratos"))).toBe(false);
    });
  });

  it("admin vê e acessa tudo, inclusive Contratos", () => {
    as([], true);
    expect(visibleMenu()).toContain("/contratos");
    expect(allowedRoutes()).toHaveLength(modules.flatMap((m) => m.routes).length);
  });
});
