import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { Module } from "@core/router/module.contract";

// ─── Mocks ───────────────────────────────────────────────────────────────

const mockAuth = {
  adminMode: false,
  authByPermission: vi.fn<(perm: string) => boolean>(() => false),
};

vi.mock("@core/auth/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

const mockFlagsmithEnabled = { value: true };
vi.mock("@core/config/featureFlags", () => ({
  get flagsmithEnabled() {
    return mockFlagsmithEnabled.value;
  },
}));

const mockHasFeature = vi.fn<(name: string) => boolean>(() => false);
vi.mock("@flagsmith/flagsmith", () => ({
  default: {
    hasFeature: (name: string) => mockHasFeature(name),
  },
}));

// Precisa vir depois dos mocks pra respeitar hoisting do vi.mock
import { useMenuItems } from "./useMenuItems";

// ─── Helpers ─────────────────────────────────────────────────────────────

const mod = (
  name: string,
  menu: Module["menu"] | undefined,
): Module => ({
  name,
  routes: [],
  menu,
});

// ─── Testes ──────────────────────────────────────────────────────────────

describe("useMenuItems", () => {
  beforeEach(() => {
    mockAuth.adminMode = false;
    mockAuth.authByPermission.mockReset().mockReturnValue(false);
    mockHasFeature.mockReset().mockReturnValue(false);
    mockFlagsmithEnabled.value = true;
  });

  it("retorna lista vazia pra modules sem menu", () => {
    const { result } = renderHook(() =>
      useMenuItems([mod("worker", undefined)]),
    );
    expect(result.current).toEqual([]);
  });

  it("ordena por `order` crescente (undefined vira 0)", () => {
    mockAuth.adminMode = true;
    const modules = [
      mod("c", { label: "C", order: 20 }),
      mod("a", { label: "A", order: 0 }),
      mod("b", { label: "B", order: 10 }),
      mod("none", { label: "None" }),
    ];
    const { result } = renderHook(() => useMenuItems(modules));
    expect(result.current.map((i) => i.label)).toEqual([
      "A",
      "None",
      "B",
      "C",
    ]);
  });

  it("adminMode ignora permission e flag", () => {
    mockAuth.adminMode = true;
    const modules = [
      mod("x", { label: "X", permission: "foo:bar", flag: "whatever" }),
    ];
    const { result } = renderHook(() => useMenuItems(modules));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].label).toBe("X");
    expect(mockAuth.authByPermission).not.toHaveBeenCalled();
    expect(mockHasFeature).not.toHaveBeenCalled();
  });

  it("filtra por permission quando não é admin", () => {
    mockAuth.authByPermission.mockImplementation((p) => p === "allowed:*");
    const modules = [
      mod("ok", { label: "OK", permission: "allowed:*" }),
      mod("ko", { label: "KO", permission: "denied:*" }),
    ];
    const { result } = renderHook(() => useMenuItems(modules));
    expect(result.current.map((i) => i.label)).toEqual(["OK"]);
  });

  it("filtra por flag quando flagsmith está habilitado", () => {
    mockAuth.authByPermission.mockReturnValue(true);
    mockHasFeature.mockImplementation((f) => f === "flag_on");
    const modules = [
      mod("a", { label: "On", flag: "flag_on" }),
      mod("b", { label: "Off", flag: "flag_off" }),
    ];
    const { result } = renderHook(() => useMenuItems(modules));
    expect(result.current.map((i) => i.label)).toEqual(["On"]);
  });

  it("ignora flag quando flagsmith está desligado", () => {
    mockFlagsmithEnabled.value = false;
    mockAuth.authByPermission.mockReturnValue(true);
    const modules = [mod("a", { label: "A", flag: "any" })];
    const { result } = renderHook(() => useMenuItems(modules));
    expect(result.current).toHaveLength(1);
    expect(mockHasFeature).not.toHaveBeenCalled();
  });

  it("poda grupo cujos children ficaram todos invisíveis", () => {
    mockAuth.authByPermission.mockReturnValue(false);
    const modules = [
      mod("group", {
        label: "Group",
        children: [
          { label: "A", permission: "denied:a" },
          { label: "B", permission: "denied:b" },
        ],
      }),
    ];
    const { result } = renderHook(() => useMenuItems(modules));
    expect(result.current).toEqual([]);
  });

  it("mantém grupo quando ao menos um child é visível", () => {
    mockAuth.authByPermission.mockImplementation((p) => p === "ok:*");
    const modules = [
      mod("group", {
        label: "Group",
        children: [
          { label: "Visible", permission: "ok:*" },
          { label: "Hidden", permission: "denied:*" },
        ],
      }),
    ];
    const { result } = renderHook(() => useMenuItems(modules));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].children?.map((c) => c.label)).toEqual([
      "Visible",
    ]);
  });
});
