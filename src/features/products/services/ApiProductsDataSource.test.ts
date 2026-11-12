import { describe, it, expect, vi } from "vitest";

import type { IHttpService } from "@core/http/models/IHttpService";
import AppError from "@shared/utils/appError";

import { ApiProductsDataSource } from "./ApiProductsDataSource";
import {
  PRODUCTS_ENDPOINTS,
  type ClientResponse,
  type NestedClientResponse,
  type NestedProductResponse,
  type ProductResponse,
} from "./contract";

// ─── UUIDs de apoio ──────────────────────────────────────────────────────────
const P_DIESEL = "e9204631-a012-4340-a07c-d2ceae2a4e8c";
const P_GASOLINA = "2890a02d-9ff4-41ef-83cd-96d0da3c1bd5";

const C_RIO = "7c3f9b22-1d4e-4a8b-9f10-2a6b5c8d4e01";
const C_AMAZONAS = "b1a2c3d4-0000-4000-8000-000000000002";
const C_SOLIMOES = "c2b3d4e5-0000-4000-8000-000000000003";

const TS = "2026-01-01T00:00:00.000Z";

const nestedClient = (
  id: string,
  name: string,
  bp: string,
  cnpj: string,
): NestedClientResponse => ({
  id,
  name,
  bp,
  cnpj: { headquarters: cnpj, branches: [] },
  isActive: true,
  createdAt: TS,
});

const nestedProduct = (
  id: string,
  name: string,
  sapCode: string,
): NestedProductResponse => ({ id, name, sapCode, createdAt: TS, updatedAt: TS });

const RIO = nestedClient(C_RIO, "Rio Negro Combustíveis LTDA", "100245", "12345678000190");
const SOLIMOES = nestedClient(C_SOLIMOES, "Solimões Energia Ltda", "100478", "11222333000144");
const DIESEL = nestedProduct(P_DIESEL, "ÓLEO DIESEL A S10", "10460");
const GASOLINA = nestedProduct(P_GASOLINA, "GASOLINA C COMUM", "10076");

const products: ProductResponse[] = [
  { ...DIESEL, clients: [RIO] },
  { ...GASOLINA, clients: [SOLIMOES] },
];
const clients: ClientResponse[] = [
  { ...RIO, updatedAt: TS, products: [DIESEL] },
  {
    ...nestedClient(C_AMAZONAS, "Distribuidora Amazonas S.A.", "100312", "98765432000110"),
    updatedAt: TS,
    products: [],
  },
  { ...SOLIMOES, updatedAt: TS, products: [GASOLINA] },
];

/**
 * `IHttpService` stub. Como na API real, as listagens (paginadas e `/all`) NÃO
 * trazem relações; elas só vêm no detalhe (`/products/:id`, `/clients/:id`).
 */
function makeHttp(): { http: IHttpService; get: ReturnType<typeof vi.fn> } {
  const get = vi.fn(async (path: string, params?: unknown) => {
    if (path === PRODUCTS_ENDPOINTS.productsRoot) {
      const { page, limit } = params as { page: number; limit: number };
      const start = (page - 1) * limit;
      return {
        rows: products
          .slice(start, start + limit)
          .map(({ clients: _c, ...p }) => p),
        total: products.length,
      };
    }
    if (path === PRODUCTS_ENDPOINTS.clientsPaginated) {
      const { page, limit } = params as { page: number; limit: number };
      const start = (page - 1) * limit;
      return {
        rows: clients
          .slice(start, start + limit)
          .map(({ products: _p, ...c }) => c),
        total: clients.length,
      };
    }
    if (path === PRODUCTS_ENDPOINTS.clients) {
      return clients.map(({ products: _p, ...c }) => c);
    }
    const p = products.find((x) => path === PRODUCTS_ENDPOINTS.productById(x.id));
    if (p) return p;
    const c = clients.find((x) => path === PRODUCTS_ENDPOINTS.clientById(x.id));
    if (c) return c;
    throw new Error(`path inesperado: ${path}`);
  });

  return { http: { get } as unknown as IHttpService, get };
}

describe("ApiProductsDataSource", () => {
  describe("loadProductsPage()", () => {
    it("chama só a API paginada com page/limit — sem /all e SEM detalhe por id", async () => {
      const { http, get } = makeHttp();
      const ds = new ApiProductsDataSource(http);
      await ds.loadProductsPage({ page: 1, limit: 10 });

      expect(get).toHaveBeenCalledTimes(1);
      expect(get).toHaveBeenCalledWith(PRODUCTS_ENDPOINTS.productsRoot, {
        page: 1,
        limit: 10,
      });
    });

    it("devolve total geral e mapeia id/name/sapCode/cor", async () => {
      const ds = new ApiProductsDataSource(makeHttp().http);
      const { rows, total } = await ds.loadProductsPage({ page: 1, limit: 10 });

      expect(total).toBe(2);
      const diesel = rows.find((p) => p.id === P_DIESEL);
      expect(diesel).toMatchObject({
        id: P_DIESEL,
        name: "ÓLEO DIESEL A S10",
        sapCode: "10460",
      });
      expect(diesel?.color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it("respeita a página pedida", async () => {
      const ds = new ApiProductsDataSource(makeHttp().http);
      const { rows, total } = await ds.loadProductsPage({ page: 2, limit: 1 });

      expect(total).toBe(2);
      expect(rows.map((p) => p.id)).toEqual([P_GASOLINA]);
    });

    it("aceita resposta sem paginação (array puro)", async () => {
      const get = vi.fn(async () => [DIESEL]);
      const ds = new ApiProductsDataSource({ get } as unknown as IHttpService);
      const { rows, total } = await ds.loadProductsPage({ page: 1, limit: 10 });
      expect(rows).toHaveLength(1);
      expect(total).toBe(1);
    });
  });

  describe("loadClientsPage()", () => {
    it("chama só /clients paginado — sem /all e SEM detalhe por id", async () => {
      const { http, get } = makeHttp();
      const ds = new ApiProductsDataSource(http);
      const { rows, total } = await ds.loadClientsPage({ page: 1, limit: 2 });

      expect(get).toHaveBeenCalledTimes(1);
      expect(get).toHaveBeenCalledWith(PRODUCTS_ENDPOINTS.clientsPaginated, {
        page: 1,
        limit: 2,
      });
      expect(total).toBe(3);
      expect(rows.map((c) => c.codigo)).toEqual(["100245", "100312"]);
      expect(rows[0].razao).toBe("Rio Negro Combustíveis LTDA");
      expect(rows[0].cnpj).toBe("12.345.678/0001-90");
      expect(typeof rows[0].id).toBe("number");
    });
  });

  describe("detalhe sob demanda", () => {
    it("getProductDetail busca SÓ o produto pedido e devolve os clientes", async () => {
      const { http, get } = makeHttp();
      const ds = new ApiProductsDataSource(http);
      const d = await ds.getProductDetail(P_GASOLINA);

      expect(get).toHaveBeenCalledTimes(1);
      expect(get).toHaveBeenCalledWith(PRODUCTS_ENDPOINTS.productById(P_GASOLINA));
      expect(d.product.id).toBe(P_GASOLINA);
      expect(d.clients.map((c) => c.codigo)).toEqual(["100478"]);
    });

    it("getClientDetail busca SÓ o cliente pedido e devolve os produtos", async () => {
      const { http, get } = makeHttp();
      const ds = new ApiProductsDataSource(http);
      const { rows } = await ds.loadClientsPage({ page: 1, limit: 10 });
      get.mockClear();

      const d = await ds.getClientDetail(rows[0].id);
      expect(get).toHaveBeenCalledTimes(1);
      expect(get).toHaveBeenCalledWith(PRODUCTS_ENDPOINTS.clientById(C_RIO));
      expect(d.products.map((p) => p.id)).toEqual([P_DIESEL]);
    });

    it("getClientDetail rejeita para cliente desconhecido (sem chamar a API)", async () => {
      const { http, get } = makeHttp();
      const ds = new ApiProductsDataSource(http);
      await expect(ds.getClientDetail(9999)).rejects.toThrow();
      expect(get).not.toHaveBeenCalled();
    });

    it("propaga erro do detalhe", async () => {
      const get = vi.fn(async () => {
        throw new AppError("Falha", "error", "AppError", 500);
      });
      const ds = new ApiProductsDataSource({ get } as unknown as IHttpService);
      await expect(ds.getProductDetail(P_DIESEL)).rejects.toBeInstanceOf(AppError);
    });
  });

  describe("listAllClients()", () => {
    it("usa /clients/all sob demanda", async () => {
      const { http, get } = makeHttp();
      const ds = new ApiProductsDataSource(http);
      const all = await ds.listAllClients();

      expect(get).toHaveBeenCalledWith(PRODUCTS_ENDPOINTS.clients);
      expect(all.map((c) => c.codigo)).toEqual(["100245", "100312", "100478"]);
    });
  });

  describe("reconciliação de identificadores", () => {
    it("usa o mesmo id substituto para o mesmo cliente entre chamadas", async () => {
      const ds = new ApiProductsDataSource(makeHttp().http);
      const all = await ds.listAllClients();
      const detail = await ds.getProductDetail(P_DIESEL);

      const rioAll = all.find((c) => c.codigo === "100245")!;
      expect(detail.clients[0].id).toBe(rioAll.id);
    });

    it("clientUuidOf traduz o id substituto para o UUID real", async () => {
      const ds = new ApiProductsDataSource(makeHttp().http);
      const all = await ds.listAllClients();
      const rio = all.find((c) => c.codigo === "100245")!;
      expect(ds.clientUuidOf(rio.id)).toBe(C_RIO);
      expect(ds.clientUuidOf(9999)).toBeUndefined();
    });
  });
  describe("vínculo a partir do cliente", () => {
    it("listAllProducts usa /products/all sob demanda", async () => {
      const get = vi.fn(async () => products.map(({ clients: _c, ...p }) => p));
      const ds = new ApiProductsDataSource({ get } as unknown as IHttpService);
      const all = await ds.listAllProducts();

      expect(get).toHaveBeenCalledWith(PRODUCTS_ENDPOINTS.products);
      expect(all.map((p) => p.id)).toEqual([P_DIESEL, P_GASOLINA]);
    });

    it("updateClientProducts faz PATCH /clients/:uuid enviando só productIds", async () => {
      const patch = vi.fn(async () => ({}));
      const { http } = makeHttp();
      const ds = new ApiProductsDataSource(
        Object.assign(http, { patch }) as IHttpService,
      );
      const { rows } = await ds.loadClientsPage({ page: 1, limit: 10 });

      await ds.updateClientProducts(rows[0].id, [P_DIESEL, P_GASOLINA]);
      await ds.updateClientProducts(rows[0].id, []);

      expect(patch).toHaveBeenNthCalledWith(1, PRODUCTS_ENDPOINTS.clientById(C_RIO), {
        productIds: [P_DIESEL, P_GASOLINA],
      });
      expect(patch).toHaveBeenNthCalledWith(2, PRODUCTS_ENDPOINTS.clientById(C_RIO), {
        productIds: [],
      });
    });

    it("updateClientProducts rejeita cliente desconhecido sem chamar a API", async () => {
      const patch = vi.fn();
      const { http } = makeHttp();
      const ds = new ApiProductsDataSource(
        Object.assign(http, { patch }) as IHttpService,
      );
      await expect(ds.updateClientProducts(9999, [])).rejects.toThrow();
      expect(patch).not.toHaveBeenCalled();
    });
  });

  describe("escrita", () => {
    const setup = () => {
      const post = vi.fn(async () => ({ ...DIESEL }));
      const patch = vi.fn(async () => ({ ...DIESEL }));
      const del = vi.fn(async () => ({ success: true }));
      const { http } = makeHttp();
      const full = Object.assign(http, { post, patch, delete: del }) as IHttpService;
      return { ds: new ApiProductsDataSource(full), post, patch, del };
    };

    it("createProduct envia somente name e sapCode", async () => {
      const { ds, post } = setup();
      await ds.createProduct({ name: "Diesel", sapCode: "123" });
      expect(post).toHaveBeenCalledWith(PRODUCTS_ENDPOINTS.productsRoot, {
        name: "Diesel",
        sapCode: "123",
      });
    });

    it("updateProduct envia só as chaves definidas", async () => {
      const { ds, patch } = setup();
      await ds.updateProduct(P_DIESEL, { name: "Novo" });
      expect(patch).toHaveBeenCalledWith(PRODUCTS_ENDPOINTS.productById(P_DIESEL), {
        name: "Novo",
      });
    });

    it("updateProduct envia clientIds completos e [] para desvincular todos", async () => {
      const { ds, patch } = setup();
      await ds.updateProduct(P_DIESEL, { clientUuids: [C_RIO, C_SOLIMOES] });
      await ds.updateProduct(P_DIESEL, { clientUuids: [] });
      expect(patch).toHaveBeenNthCalledWith(1, PRODUCTS_ENDPOINTS.productById(P_DIESEL), {
        clientIds: [C_RIO, C_SOLIMOES],
      });
      expect(patch).toHaveBeenNthCalledWith(2, PRODUCTS_ENDPOINTS.productById(P_DIESEL), {
        clientIds: [],
      });
    });

    it("deleteProduct chama DELETE e propaga o erro 500", async () => {
      const { ds, del } = setup();
      await ds.deleteProduct(P_DIESEL);
      expect(del).toHaveBeenCalledWith(PRODUCTS_ENDPOINTS.productById(P_DIESEL));
      del.mockRejectedValueOnce(new AppError("Erro", "error", "AppError", 500));
      await expect(ds.deleteProduct(P_DIESEL)).rejects.toMatchObject({ status: 500 });
    });
  });

  describe("propagação de erros", () => {
    it("rejeita quando http.get rejeita (AppError propaga)", async () => {
      const get = vi.fn(async () => {
        throw new AppError("Falha de rede", "error", "AppError", 500);
      });
      const ds = new ApiProductsDataSource({ get } as unknown as IHttpService);

      await expect(
        ds.loadProductsPage({ page: 1, limit: 10 }),
      ).rejects.toBeInstanceOf(AppError);
    });
  });
});
