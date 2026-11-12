import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import type { Module } from "@core/router/module.contract";

// ─── Mocks ───────────────────────────────────────────────────────────────

const granted = new Set<string>();
const mockAuth = {
  adminMode: false,
  authByPermission: (perm: string) => granted.has(perm),
};

vi.mock("@core/auth/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

// Flags desligadas: o filtro do menu depende só das permissões.
vi.mock("@core/config/featureFlags", () => ({ flagsmithEnabled: false }));
vi.mock("@flagsmith/flagsmith", () => ({ default: { hasFeature: () => true } }));

const PERM_DASHBOARD = "portal_nave:dashboard:read";
const PERM_TANK = "portal_nave:balances_tank:read";
const PERM_CLIENTS = "portal_nave:client_registry:read";

// Espelha a estrutura real do menu: folha na raiz (Início), grupos com
// filhos (Saldos, Administrador) e ordenação por `order`.
const mockModules: Module[] = [
  {
    name: "administrador",
    routes: [],
    menu: {
      label: "Administrador",
      order: 85,
      children: [
        { label: "Clientes", path: "/registrations/clients", permission: PERM_CLIENTS },
      ],
    },
  },
  {
    name: "inicio",
    routes: [],
    menu: { label: "Início", path: "/inicio", order: 0, permission: PERM_DASHBOARD },
  },
  {
    name: "saldos",
    routes: [],
    menu: {
      label: "Saldos",
      order: 10,
      children: [
        { label: "Saldos por tanque", path: "/saldos/tanque", permission: PERM_TANK },
      ],
    },
  },
];

vi.mock("@core/router/modules", () => ({
  get modules() {
    return mockModules;
  },
}));

// Precisa vir depois dos mocks pra respeitar o hoisting do vi.mock
import { HomeRedirect } from "./HomeRedirect";

// ─── Helpers ─────────────────────────────────────────────────────────────

const CurrentPath = () => <span data-testid="path">{useLocation().pathname}</span>;

const renderAtRoot = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="*" element={<CurrentPath />} />
      </Routes>
    </MemoryRouter>,
  );

const redirectedTo = () => screen.getByTestId("path").textContent;

// ─── Testes ──────────────────────────────────────────────────────────────

describe("HomeRedirect", () => {
  beforeEach(() => {
    granted.clear();
    mockAuth.adminMode = false;
  });

  it("com permissão de um só módulo cai na rota dele", () => {
    granted.add(PERM_CLIENTS);
    renderAtRoot();
    expect(redirectedTo()).toBe("/registrations/clients");
  });

  it("com portal_nave:dashboard:read cai em /inicio", () => {
    granted.add(PERM_DASHBOARD).add(PERM_TANK).add(PERM_CLIENTS);
    renderAtRoot();
    expect(redirectedTo()).toBe("/inicio");
  });

  it("sem dashboard segue a ordem do menu (primeiro grupo acessível)", () => {
    granted.add(PERM_TANK).add(PERM_CLIENTS);
    renderAtRoot();
    expect(redirectedTo()).toBe("/saldos/tanque");
  });

  it("sem nenhuma permissão cai em /access-denied", () => {
    renderAtRoot();
    expect(redirectedTo()).toBe("/access-denied");
  });

  it("admin cai em /inicio (primeiro item do menu)", () => {
    mockAuth.adminMode = true;
    renderAtRoot();
    expect(redirectedTo()).toBe("/inicio");
  });
});
