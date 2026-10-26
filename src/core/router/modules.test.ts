import { describe, it, expect } from "vitest";
import { buildModuleList } from "./modules";
import type { Module } from "./module.contract";

const makeModule = (name: string, order?: number): Module => ({
  name,
  routes: [{ path: `/${name}`, element: null }],
  menu: { label: name, order },
});

describe("buildModuleList", () => {
  it("retorna lista vazia pra objeto vazio", () => {
    expect(buildModuleList({})).toEqual([]);
  });

  it("desenpacota o `.default` de cada entrada", () => {
    const home = makeModule("home", 0);
    const financeiro = makeModule("financeiro", 10);
    const result = buildModuleList({
      "../../features/home/module.tsx": { default: home },
      "../../features/financeiro/module.tsx": { default: financeiro },
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(home);
    expect(result[1]).toBe(financeiro);
  });

  it("mantém a ordem de inserção (não ordena por menu.order)", () => {
    const first = makeModule("z-last", 99);
    const second = makeModule("a-first", 0);
    const result = buildModuleList({
      "z": { default: first },
      "a": { default: second },
    });
    expect(result.map((m) => m.name)).toEqual(["z-last", "a-first"]);
  });

  it("ignora entradas sem `default`", () => {
    const home = makeModule("home");
    const result = buildModuleList({
      "../../features/empty/module.tsx": {},
      "../../features/home/module.tsx": { default: home },
      "../../features/undef/module.tsx": undefined,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(home);
  });

  it("preserva módulos sem menu (features invisíveis)", () => {
    const invisible: Module = { name: "worker", routes: [] };
    const result = buildModuleList({ "w": { default: invisible } });
    expect(result).toEqual([invisible]);
  });
});
