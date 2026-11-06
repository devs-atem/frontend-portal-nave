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
const P_ORPHAN = "aa51f146-d648-4187-ab54-f9c5a53e623f";

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
const DIESEL = nestedProduct(P_DIESEL, "ÓLEO DIESEL A S10", "10460");
const GASOLINA = nestedProduct(P_GASOLINA, "GASOLINA C COMUM", "10076");

const SOLIMOES = nestedClient(C_SOLIMOES, "Solimões Energia Ltda", "100478", "11222333000144");

/**
 * Monta respostas canônicas do contrato. Os vínculos vivem no detalhe do
 * produto (`GET /products/:id`); `makeHttp` remove as relações das listagens.
 * - Diesel → Rio Negro.
 * - Gasolina → Solimões.
 * - Amazonas não tem produtos.
 */
function makeResponses(): {
  products: ProductResponse[];
  clients: ClientResponse[];
} {
  const products: ProductResponse[] = [
    { ...DIESEL, clients: [RIO] },
    { ...GASOLINA, clients: [SOLIMOES] },
  ];

  const clients: ClientResponse[] = [
    { ...RIO, updatedAt: TS },
    {
      ...nestedClient(C_AMAZONAS, "Distribuidora Amazonas S.A.", "100312", "98765432000110"),
      updatedAt: TS,
    },
    { ...SOLIMOES, updatedAt: TS },
  ];

  return { products, clients };
}

/**
 * Cria um `IHttpService` stub cujo `get` devolve as respostas canônicas de
 * acordo com o path. Como na API real, as listagens `/all` NÃO trazem relações
 * aninhadas; os clientes de um produto só vêm em `GET /products/:id`.
 * Retorna também o spy `get` para asserções de contagem.
 */
function makeHttp(
  responses = makeResponses(),
): { http: IHttpService; get: ReturnType<typeof vi.fn> } {
  const get = vi.fn(async (path: string) => {
    if (path === PRODUCTS_ENDPOINTS.products) {
      return responses.products.map(
        ({ clients: _clients, ...product }) => product,
      );
    }
    if (path === PRODUCTS_ENDPOINTS.clients) {
      return responses.clients.map(
        ({ products: _products, ...client }) => client,
      );
    }
    const detail = responses.products.find(
      (p) => path === PRODUCTS_ENDPOINTS.productById(p.id),
    );
    if (detail) return detail;
    throw new Error(`path inesperado: ${path}`);
  });

  const http = { get } as unknown as IHttpService;
  return { http, get };
}

describe("ApiProductsDataSource", () => {
  describe("mapeamento de campos", () => {
    it("mapeia id/name/sapCode e aplica defaults aos campos ausentes na API", async () => {
      const { http } = makeHttp();
      const ds = new ApiProductsDataSource(http);
      await ds.load();

      const diesel = ds.products.find((p) => p.id === P_DIESEL);
      expect(diesel).toMatchObject({
        id: P_DIESEL,
        name: "ÓLEO DIESEL A S10",
        sapCode: "10460",
        abbreviation: "",
        group: "",
        active: true,
      });
      expect(diesel?.color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it("gera cor estável por produto", async () => {
      const a = new ApiProductsDataSource(makeHttp().http);
      const b = new ApiProductsDataSource(makeHttp().http);
      await Promise.all([a.load(), b.load()]);
      expect(a.products.map((p) => p.color)).toEqual(
        b.products.map((p) => p.color),
      );
    });

    it("mapeia name→razao, bp→codigo e formata o CNPJ da matriz", async () => {
      const { http } = makeHttp();
      const ds = new ApiProductsDataSource(http);
      await ds.load();

      const rio = ds.clients.find((c) => c.codigo === "100245");
      expect(rio?.razao).toBe("Rio Negro Combustíveis LTDA");
      expect(rio?.cnpj).toBe("12.345.678/0001-90");
      expect(typeof rio?.id).toBe("number");
    });
  });

  describe("derivação das relações aninhadas", () => {
    it("deriva clientsOfProduct a partir do lado do produto", async () => {
      const { http } = makeHttp();
      const ds = new ApiProductsDataSource(http);
      await ds.load();

      const clients = ds.clientsOfProduct(P_DIESEL);
      expect(clients.map((c) => c.codigo)).toEqual(["100245"]);
    });

    it("deriva vínculos de cada produto a partir de GET /products/:id", async () => {
      const { http } = makeHttp();
      const ds = new ApiProductsDataSource(http);
      await ds.load();

      const clients = ds.clientsOfProduct(P_GASOLINA);
      expect(clients.map((c) => c.codigo)).toEqual(["100478"]);

      const products = ds.productsOfClient(ds.clients[2].id);
      expect(products.map((p) => p.id)).toEqual([P_GASOLINA]);
    });

    it("conta cada vínculo uma única vez", async () => {
      const { http } = makeHttp();
      const ds = new ApiProductsDataSource(http);
      await ds.load();

      expect(ds.clientCountOfProduct(P_DIESEL)).toBe(1);
      const rio = ds.clients.find((c) => c.codigo === "100245");
      expect(ds.productCountOfClient(rio!.id)).toBe(1);
    });

    it("retorna vazio/zero para ids sem vínculos", async () => {
      const { http } = makeHttp();
      const ds = new ApiProductsDataSource(http);
      await ds.load();

      expect(ds.clientsOfProduct(P_ORPHAN)).toEqual([]);
      expect(ds.clientCountOfProduct(P_ORPHAN)).toBe(0);
      expect(ds.productsOfClient(9999)).toEqual([]);
      expect(ds.productCountOfClient(9999)).toBe(0);
    });
  });

  describe("reconciliação de identificadores", () => {
    it("atribui substitutos numéricos estáveis por ordem de inserção dos clientes", async () => {
      const { http } = makeHttp();
      const ds = new ApiProductsDataSource(http);
      await ds.load();

      // Ordem do endpoint de clientes: Rio(1), Amazonas(2), Solimões(3).
      expect(ds.clients.map((c) => c.id)).toEqual([1, 2, 3]);
      expect(ds.clients.map((c) => c.codigo)).toEqual([
        "100245",
        "100312",
        "100478",
      ]);
    });

    it("mapeia clientes que aparecem apenas aninhados sob produtos", async () => {
      // Produto referencia um cliente que NÃO está na lista de clientes.
      const responses = makeResponses();
      const C_NESTED_ONLY = "d3c4e5f6-0000-4000-8000-000000000009";
      responses.products[1].clients = [
        SOLIMOES,
        nestedClient(C_NESTED_ONLY, "Cliente Só Aninhado", "100999", "00000000000100"),
      ];
      const { http } = makeHttp(responses);
      const ds = new ApiProductsDataSource(http);
      await ds.load();

      // O vínculo é construído mesmo que o cliente não esteja na lista.
      expect(ds.clientCountOfProduct(P_GASOLINA)).toBe(2); // Solimões + nested-only
    });
  });

  describe("load()", () => {
    it("é idempotente: não refaz as requisições ao chamar duas vezes", async () => {
      const { http, get } = makeHttp();
      const ds = new ApiProductsDataSource(http);

      await ds.load();
      const callsAfterFirst = get.mock.calls.length;
      const productsRef = ds.products;
      const clientsRef = ds.clients;

      await ds.load();

      expect(get.mock.calls.length).toBe(callsAfterFirst);
      expect(ds.products).toBe(productsRef);
      expect(ds.clients).toBe(clientsRef);
    });

    it("busca as listagens (/all) e o detalhe de cada produto", async () => {
      const { http, get } = makeHttp();
      const ds = new ApiProductsDataSource(http);
      await ds.load();

      expect(get).toHaveBeenCalledWith("/rest/products/all");
      expect(get).toHaveBeenCalledWith("/rest/clients/all");
      expect(get).toHaveBeenCalledWith(`/rest/products/${P_DIESEL}`);
      expect(get).toHaveBeenCalledWith(`/rest/products/${P_GASOLINA}`);
    });
  });

  describe("propagação de erros", () => {
    it("rejeita quando http.get rejeita (AppError propaga)", async () => {
      const get = vi.fn(async () => {
        throw new AppError("Falha de rede", "error", "AppError", 500);
      });
      const http = { get } as unknown as IHttpService;
      const ds = new ApiProductsDataSource(http);

      await expect(ds.load()).rejects.toBeInstanceOf(AppError);
    });
  });
});
