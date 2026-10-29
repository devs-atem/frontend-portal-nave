import { describe, it, expect, vi } from "vitest";

import type { IHttpService } from "@core/http/models/IHttpService";
import AppError from "@shared/utils/appError";

import { ApiProductsDataSource } from "./ApiProductsDataSource";
import {
  PRODUCTS_ENDPOINTS,
  type ClientResponse,
  type ProductResponse,
} from "./contract";

// ─── UUIDs de apoio ──────────────────────────────────────────────────────────
const P_DIESEL = "e9204631-a012-4340-a07c-d2ceae2a4e8c";
const P_GASOLINA = "2890a02d-9ff4-41ef-83cd-96d0da3c1bd5";
const P_ORPHAN = "aa51f146-d648-4187-ab54-f9c5a53e623f";

const C_RIO = "7c3f9b22-1d4e-4a8b-9f10-2a6b5c8d4e01";
const C_AMAZONAS = "b1a2c3d4-0000-4000-8000-000000000002";
const C_SOLIMOES = "c2b3d4e5-0000-4000-8000-000000000003";

/**
 * Monta respostas canônicas do contrato. A relação produto↔cliente é expressa
 * de forma assimétrica de propósito, para exercitar a derivação a partir de
 * AMBAS as direções:
 * - Diesel aninha Rio Negro (lado do produto).
 * - Solimões aninha Gasolina (lado do cliente) — esse vínculo não aparece no
 *   lado do produto.
 * - Diesel↔Rio Negro é expresso nos dois lados (deve ser de-duplicado).
 */
function makeResponses(): {
  products: ProductResponse[];
  clients: ClientResponse[];
} {
  const products: ProductResponse[] = [
    {
      id: P_DIESEL,
      name: "ÓLEO DIESEL A S10",
      abbreviation: "AS-10",
      sapCode: "10460",
      color: "#a18a9f",
      group: "Diesel",
      active: true,
      clients: [
        {
          id: C_RIO,
          codigo: "CLI-001",
          razaoSocial: "Rio Negro Combustíveis LTDA",
          cnpj: "12.345.678/0001-90",
        },
      ],
    },
    {
      id: P_GASOLINA,
      name: "GASOLINA C COMUM",
      abbreviation: "Gasolina C",
      sapCode: "10076",
      color: "#29fca7",
      group: "Gasolina",
      active: false,
      // sem clientes aninhados no lado do produto
    },
  ];

  const clients: ClientResponse[] = [
    {
      id: C_RIO,
      codigo: "CLI-001",
      razaoSocial: "Rio Negro Combustíveis LTDA",
      cnpj: "12.345.678/0001-90",
      products: [
        {
          id: P_DIESEL,
          name: "ÓLEO DIESEL A S10",
          abbreviation: "AS-10",
          sapCode: "10460",
          color: "#a18a9f",
          group: "Diesel",
          active: true,
        },
      ],
    },
    {
      id: C_AMAZONAS,
      codigo: "CLI-002",
      razaoSocial: "Distribuidora Amazonas S.A.",
      cnpj: "98.765.432/0001-10",
      // sem produtos
    },
    {
      id: C_SOLIMOES,
      codigo: "CLI-003",
      razaoSocial: "Solimões Energia Ltda",
      cnpj: "11.222.333/0001-44",
      products: [
        {
          id: P_GASOLINA,
          name: "GASOLINA C COMUM",
          abbreviation: "Gasolina C",
          sapCode: "10076",
          color: "#29fca7",
          group: "Gasolina",
          active: false,
        },
      ],
    },
  ];

  return { products, clients };
}

/**
 * Cria um `IHttpService` stub cujo `get` devolve as respostas canônicas de
 * acordo com o path. Retorna também o spy `get` para asserções de contagem.
 */
function makeHttp(
  responses = makeResponses(),
): { http: IHttpService; get: ReturnType<typeof vi.fn> } {
  const get = vi.fn(async (path: string) => {
    if (path === PRODUCTS_ENDPOINTS.products) return responses.products;
    if (path === PRODUCTS_ENDPOINTS.clients) return responses.clients;
    throw new Error(`path inesperado: ${path}`);
  });

  const http = { get } as unknown as IHttpService;
  return { http, get };
}

describe("ApiProductsDataSource", () => {
  describe("mapeamento de campos", () => {
    it("mapeia os campos do produto 1:1", async () => {
      const { http } = makeHttp();
      const ds = new ApiProductsDataSource(http);
      await ds.load();

      const diesel = ds.products.find((p) => p.id === P_DIESEL);
      expect(diesel).toEqual({
        id: P_DIESEL,
        name: "ÓLEO DIESEL A S10",
        abbreviation: "AS-10",
        sapCode: "10460",
        color: "#a18a9f",
        group: "Diesel",
        active: true,
      });
    });

    it("mapeia razaoSocial→razao e preserva codigo/cnpj", async () => {
      const { http } = makeHttp();
      const ds = new ApiProductsDataSource(http);
      await ds.load();

      const rio = ds.clients.find((c) => c.codigo === "CLI-001");
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
      expect(clients.map((c) => c.codigo)).toEqual(["CLI-001"]);
    });

    it("deriva vínculos a partir do lado do cliente quando ausentes no produto", async () => {
      const { http } = makeHttp();
      const ds = new ApiProductsDataSource(http);
      await ds.load();

      // Gasolina↔Solimões só existe aninhado no lado do cliente.
      const clients = ds.clientsOfProduct(P_GASOLINA);
      expect(clients.map((c) => c.codigo)).toEqual(["CLI-003"]);

      const products = ds.productsOfClient(ds.clients[2].id);
      expect(products.map((p) => p.id)).toEqual([P_GASOLINA]);
    });

    it("de-duplica vínculos expressos em ambas as direções", async () => {
      const { http } = makeHttp();
      const ds = new ApiProductsDataSource(http);
      await ds.load();

      // Diesel↔Rio Negro aparece no produto e no cliente: deve contar 1 vez.
      expect(ds.clientCountOfProduct(P_DIESEL)).toBe(1);
      const rio = ds.clients.find((c) => c.codigo === "CLI-001");
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

      // Ordem do endpoint /rest/clients: Rio(1), Amazonas(2), Solimões(3).
      expect(ds.clients.map((c) => c.id)).toEqual([1, 2, 3]);
      expect(ds.clients.map((c) => c.codigo)).toEqual([
        "CLI-001",
        "CLI-002",
        "CLI-003",
      ]);
    });

    it("mapeia clientes que aparecem apenas aninhados sob produtos", async () => {
      // Produto referencia um cliente que NÃO está na lista /rest/clients.
      const responses = makeResponses();
      const C_NESTED_ONLY = "d3c4e5f6-0000-4000-8000-000000000009";
      responses.products[1].clients = [
        {
          id: C_NESTED_ONLY,
          codigo: "CLI-009",
          razaoSocial: "Cliente Só Aninhado",
          cnpj: "00.000.000/0001-00",
        },
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

    it("busca ambas as coleções em paralelo", async () => {
      const { http, get } = makeHttp();
      const ds = new ApiProductsDataSource(http);
      await ds.load();

      expect(get).toHaveBeenCalledWith(PRODUCTS_ENDPOINTS.products);
      expect(get).toHaveBeenCalledWith(PRODUCTS_ENDPOINTS.clients);
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
