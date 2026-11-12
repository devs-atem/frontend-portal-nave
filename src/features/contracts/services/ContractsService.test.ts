import { describe, it, expect, vi } from "vitest";

import type { IHttpService } from "@core/http/models/IHttpService";
import AppError from "@shared/utils/appError";

import { CONTRACTS_ENDPOINTS } from "./contract";
import { contractErrorMessage, isStaleStateError } from "./contractErrors";
import { ContractsService } from "./ContractsService";
import { OwnersService } from "./OwnersService";
import { ReferenceService } from "./ReferenceService";

const mk = (http: Record<string, unknown>) => http as unknown as IHttpService;
const err = (status: number, msg = "x") => new AppError(msg, "error", "AppError", status);

describe("ContractsService", () => {
  it("list() envia só parâmetros definidos e aplica page/limit", async () => {
    const get = vi.fn(async () => ({ rows: [], total: 0 }));
    await new ContractsService(mk({ get })).list({
      status: "ACTIVE",
      baseCode: "SSA",
      internalCode: "",
      ownerId: undefined,
    });
    expect(get).toHaveBeenCalledWith(CONTRACTS_ENDPOINTS.root, {
      status: "ACTIVE",
      baseCode: "SSA",
      page: 1,
      limit: 10,
    });
  });

  it("list() limita limit a 1..100", async () => {
    const get = vi.fn(async () => ({ rows: [], total: 0 }));
    const svc = new ContractsService(mk({ get }));
    await svc.list({ limit: 500 });
    await svc.list({ limit: 0, page: -3 });
    const [first, second] = get.mock.calls.map((c) => (c as unknown[])[1] as Record<string, number>);
    expect(first.limit).toBe(100);
    expect(second).toMatchObject({ limit: 1, page: 1 });
  });

  it("listAll() percorre todas as páginas do filtro (contagem correta no filtro por cliente)", async () => {
    const get = vi.fn(async (_p: string, q: { page: number }) =>
      q.page === 1
        ? { rows: Array.from({ length: 100 }, (_, i) => ({ id: `c${i}` })), total: 150 }
        : { rows: Array.from({ length: 50 }, (_, i) => ({ id: `d${i}` })), total: 150 },
    );
    const all = await new ContractsService(mk({ get })).listAll({ ownerId: "o1" });
    expect(all).toHaveLength(150);
    expect(get).toHaveBeenNthCalledWith(1, CONTRACTS_ENDPOINTS.root, { ownerId: "o1", page: 1, limit: 100 });
  });

  it("list() devolve vazio quando a API responde sem corpo", async () => {
    const get = vi.fn(async () => undefined);
    expect(await new ContractsService(mk({ get })).list()).toEqual({ rows: [], total: 0 });
  });

  it("act() envia corpo mínimo: justificativa e, só no approve, stockDeclaration", async () => {
    const post = vi.fn(async () => ({}));
    const svc = new ContractsService(mk({ post }));
    await svc.act("c1", "approve", { justification: " ok ", stockDeclaration: "ZERO" });
    await svc.act("c1", "suspend", { justification: "x", stockDeclaration: "ZERO" });
    await svc.act("c1", "submit");
    expect(post).toHaveBeenNthCalledWith(1, CONTRACTS_ENDPOINTS.action("c1", "approve"), {
      justification: "ok",
      stockDeclaration: "ZERO",
    });
    expect(post).toHaveBeenNthCalledWith(2, CONTRACTS_ENDPOINTS.action("c1", "suspend"), {
      justification: "x",
    });
    expect(post).toHaveBeenNthCalledWith(3, CONTRACTS_ENDPOINTS.action("c1", "submit"), {});
  });

  it("create/update/createRevision usam os endpoints corretos", async () => {
    const post = vi.fn(async () => ({}));
    const patch = vi.fn(async () => ({}));
    const svc = new ContractsService(mk({ post, patch }));
    const body = { revision: { items: [] } } as never;
    await svc.create(body);
    await svc.update("c1", body);
    await svc.createRevision("c1", { effectiveFrom: "x", justification: "j", items: [] });
    expect(post).toHaveBeenNthCalledWith(1, CONTRACTS_ENDPOINTS.root, body);
    expect(patch).toHaveBeenCalledWith(CONTRACTS_ENDPOINTS.byId("c1"), body);
    expect(post).toHaveBeenNthCalledWith(2, CONTRACTS_ENDPOINTS.revisions("c1"), expect.anything());
  });

  it("propaga AppError", async () => {
    const get = vi.fn(async () => {
      throw err(403);
    });
    await expect(new ContractsService(mk({ get })).get("c1")).rejects.toBeInstanceOf(AppError);
  });
});

describe("OwnersService", () => {
  it("findByCnpjs consulta um por CNPJ normalizado e remove duplicados", async () => {
    const get = vi.fn(async (_p: string, q: { cnpj: string }) => ({
      rows: [{ id: `o-${q.cnpj}`, cnpj: q.cnpj }],
      total: 1,
    }));
    const owners = await new OwnersService(mk({ get })).findByCnpjs([
      "12.345.678/0001-95",
      "12345678000195",
      "98765432000110",
    ]);
    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenCalledWith(CONTRACTS_ENDPOINTS.owners, { cnpj: "12345678000195", limit: 100 });
    expect(owners.map((o) => o.id).sort()).toEqual(["o-12345678000195", "o-98765432000110"]);
  });

  it("listProducts percorre as páginas", async () => {
    const get = vi.fn(async (_p: string, q: { page: number }) =>
      q.page === 1
        ? { rows: Array.from({ length: 100 }, (_, i) => ({ productId: `p${i}` })), total: 101 }
        : { rows: [{ productId: "p100" }], total: 101 },
    );
    const rows = await new OwnersService(mk({ get })).listProducts("o1");
    expect(rows).toHaveLength(101);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("addProduct envia só rótulos preenchidos", async () => {
    const post = vi.fn(async () => ({}));
    await new OwnersService(mk({ post })).addProduct("o1", {
      productId: "p1",
      customerProductCode: " DSL ",
      customerProductDescription: "",
    });
    expect(post).toHaveBeenCalledWith(CONTRACTS_ENDPOINTS.ownerProducts("o1"), {
      productId: "p1",
      customerProductCode: "DSL",
    });
  });
});

describe("ReferenceService", () => {
  it("listPools filtra por base ativa e produto (sapCode)", async () => {
    const get = vi.fn(async () => ({ rows: [{ id: "pool1" }], total: 1 }));
    const pools = await new ReferenceService(mk({ get })).listPools({
      source: "S",
      baseCode: "SSA",
      productCode: "123",
    });
    expect(pools).toHaveLength(1);
    expect(get).toHaveBeenCalledWith(CONTRACTS_ENDPOINTS.pools, {
      source: "S",
      baseCode: "SSA",
      status: "ACTIVE",
      productCode: "123",
      page: 1,
      limit: 100,
    });
  });

  it("listPoolsByBase busca todos os pools da base (qualquer status)", async () => {
    const get = vi.fn(async () => ({ rows: [{ id: "p1", code: "A", name: "Pool A" }], total: 1 }));
    const pools = await new ReferenceService(mk({ get })).listPoolsByBase({ source: "S", baseCode: "SSA" });
    expect(pools).toHaveLength(1);
    expect(get).toHaveBeenCalledWith(CONTRACTS_ENDPOINTS.pools, { source: "S", baseCode: "SSA", page: 1, limit: 100 });
  });

  it("listBases usa GET /operational-catalog/bases/all (sem paginação) e mantém só as ativas", async () => {
    const base = (baseCode: string, status: string) => ({
      id: baseCode, source: "SAP", baseCode, name: baseCode, status,
    });
    const get = vi.fn(async () => [base("C001", "ACTIVE"), base("C002", "INACTIVE"), base("C009", "ACTIVE")]);
    const result = await new ReferenceService(mk({ get })).listBases();

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(CONTRACTS_ENDPOINTS.basesAll);
    expect(CONTRACTS_ENDPOINTS.basesAll).toBe("/rest/operational-catalog/bases/all");
    expect(result.map((b) => b.baseCode)).toEqual(["C001", "C009"]);
  });

  it("listBases aceita { rows } e resposta vazia", async () => {
    const rows = vi.fn(async () => ({ rows: [{ id: "1", source: "S", baseCode: "B", name: "B", status: "ACTIVE" }] }));
    expect(await new ReferenceService(mk({ get: rows })).listBases()).toHaveLength(1);
    const none = vi.fn(async () => undefined);
    expect(await new ReferenceService(mk({ get: none })).listBases()).toEqual([]);
  });
});

describe("contractErrorMessage", () => {
  it("403 nunca expõe o texto técnico", () => {
    expect(contractErrorMessage(err(403, "User 'x' does not have required permissions"), "f")).toBe(
      "Você não tem permissão para esta ação.",
    );
  });

  it("traduz mensagens conhecidas", () => {
    expect(contractErrorMessage(err(409, "Contract has non-zero custody exposure"), "f")).toMatch(/saldo/);
    expect(contractErrorMessage(err(400, "Pool does not allow the product"), "f")).toMatch(/pool/i);
    expect(contractErrorMessage(err(409, "Contract identity already exists"), "f")).toMatch(/Já existe/);
  });

  it("404 fala de escopo; fallback usa a mensagem", () => {
    expect(contractErrorMessage(err(404), "f")).toMatch(/escopo/);
    expect(contractErrorMessage(err(503, "Indisponível"), "f")).toBe("Indisponível");
    expect(contractErrorMessage(null, "fallback")).toBe("fallback");
  });

  it("identifica erros de estado obsoleto", () => {
    expect(isStaleStateError(err(400, "Invalid contract transition: ACTIVE -> DRAFT"))).toBe(true);
    expect(isStaleStateError(err(400, "Only DRAFT contracts can be edited"))).toBe(true);
    expect(isStaleStateError(err(400, "outra"))).toBe(false);
  });
});
