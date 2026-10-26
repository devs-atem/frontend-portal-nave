import { describe, it, expect } from "vitest";
import { createContainer } from "iti";

import type {
  Module,
  ModuleIoCContainer,
} from "@core/router/module.contract";

import { appContainer, createAppContainer } from "./index";

/**
 * Service fake usado nos testes. Expõe um método mínimo pra evitar
 * exigir instanciar classes de verdade.
 */
class FakeService {
  constructor(public name: string) {}
}

/**
 * Aumenta a interface só pra esse arquivo de teste exercitar o pattern
 * de declaration merging que as features vão usar na vida real. Os
 * tipos ficam visíveis globalmente, mas em runtime cada teste cria o
 * próprio container via `createAppContainer()` — sem compartilhamento
 * de estado entre casos.
 */
declare module "./registry" {
  interface AppServices {
    testFoo?: FakeService;
    testBar?: FakeService;
    testWithDep?: { http: unknown };
  }
}

describe("appContainer (singleton)", () => {
  it("expõe os services base registrados pelo core", () => {
    expect(appContainer.get("http")).toBeDefined();
    expect(appContainer.get("auth")).toBeDefined();
  });
});

describe("createAppContainer", () => {
  it("devolve uma instância nova a cada chamada (isolamento)", () => {
    const a = createAppContainer();
    const b = createAppContainer();
    expect(a).not.toBe(b);
    expect(a.get("http")).not.toBe(b.get("http"));
  });

  it("nasce já com os services base do core", () => {
    const c = createAppContainer();
    expect(c.get("http")).toBeDefined();
    expect(c.get("auth")).toBeDefined();
  });

  it("aplica o callback `services` de cada módulo passado em register", () => {
    const foo: Module = {
      name: "fake-foo",
      routes: [],
      services: (c: ModuleIoCContainer) =>
        c.add({ testFoo: new FakeService("foo") }),
    };

    const c = createAppContainer();
    c.register([foo]);
    expect(c.get("testFoo")).toBeInstanceOf(FakeService);
    expect(c.get("testFoo")?.name).toBe("foo");
  });

  it("mantém disponibilidade dos services do core após registro de módulos", () => {
    const bar: Module = {
      name: "fake-bar",
      routes: [],
      services: (c: ModuleIoCContainer) =>
        c.add({ testBar: new FakeService("bar") }),
    };

    const c = createAppContainer();
    c.register([bar]);
    expect(c.get("http")).toBeDefined();
    expect(c.get("auth")).toBeDefined();
    expect(c.get("testBar")?.name).toBe("bar");
  });

  it("ignora módulos sem callback `services`", () => {
    const uiOnly: Module = { name: "ui-only", routes: [] };
    const c = createAppContainer();
    expect(() => c.register([uiOnly])).not.toThrow();
  });

  it("permite usar o service do core dentro do callback do módulo", () => {
    class ServiceDeps {
      constructor(public http: unknown) {}
    }

    const mod: Module = {
      name: "fake-with-dep",
      routes: [],
      services: (c: ModuleIoCContainer) => {
        const http = c.get("http");
        return c.add({ testWithDep: new ServiceDeps(http) });
      },
    };

    const c = createAppContainer();
    c.register([mod]);
    const resolved = c.get("testWithDep");
    expect(resolved?.http).toBeDefined();
  });
});

// Garante que o `createContainer` do `iti` continua resolvível (regressão
// histórica — o patch-iti.mjs já não é necessário em iti@0.8).
describe("iti sanity", () => {
  it("exporta createContainer com tipos", () => {
    const c = createContainer().add({ x: 1 });
    expect(c.get("x")).toBe(1);
  });
});
