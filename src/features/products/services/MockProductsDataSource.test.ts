import { describe, it, expect } from "vitest";

import { CLIENTES } from "@shared/domain";

import { MockProductsDataSource } from "./MockProductsDataSource";

// IDs reais do catálogo usados nas asserções determinísticas.
const DIESEL_S10 = "e9204631-a012-4340-a07c-d2ceae2a4e8c"; // clientes 1 e 3
const GASOLINA_C = "2890a02d-9ff4-41ef-83cd-96d0da3c1bd5"; // clientes 1, 2 e 3
const BIODIESEL = "aa51f146-d648-4187-ab54-f9c5a53e623f"; // cliente 1

describe("MockProductsDataSource", () => {
  const ds = new MockProductsDataSource();

  describe("snapshot", () => {
    it("expõe o catálogo e os clientes das seeds", () => {
      expect(ds.products.length).toBe(11);
      expect(ds.clients).toBe(CLIENTES);
    });
  });

  describe("clientsOfProduct", () => {
    it("retorna os clientes vinculados, resolvidos a partir das seeds", () => {
      const clients = ds.clientsOfProduct(DIESEL_S10);
      expect(clients.map((c) => c.id)).toEqual([1, 3]);
      expect(clients[0].razao).toBe("Rio Negro Combustíveis Ltda");
    });

    it("retorna lista vazia para um produto sem vínculos ou inexistente", () => {
      expect(ds.clientsOfProduct("id-inexistente")).toEqual([]);
    });
  });

  describe("productsOfClient", () => {
    it("retorna os produtos vinculados a um cliente", () => {
      const products = ds.productsOfClient(3);
      expect(products.map((p) => p.id)).toEqual([
        GASOLINA_C,
        DIESEL_S10,
        "3b85e1ee-afdb-4dc2-b755-43948e69adf1",
        "fbe6e5cb-3312-4325-8e17-0bcc27254d94",
      ]);
    });

    it("retorna lista vazia para um cliente sem vínculos", () => {
      expect(ds.productsOfClient(999)).toEqual([]);
    });
  });

  describe("clientCountOfProduct", () => {
    it("conta os clientes vinculados a um produto", () => {
      expect(ds.clientCountOfProduct(GASOLINA_C)).toBe(3);
      expect(ds.clientCountOfProduct(BIODIESEL)).toBe(1);
      expect(ds.clientCountOfProduct("id-inexistente")).toBe(0);
    });
  });

  describe("productCountOfClient", () => {
    it("conta os produtos vinculados a um cliente", () => {
      expect(ds.productCountOfClient(1)).toBe(6);
      expect(ds.productCountOfClient(2)).toBe(5);
      expect(ds.productCountOfClient(3)).toBe(4);
      expect(ds.productCountOfClient(999)).toBe(0);
    });
  });

  describe("load", () => {
    it("resolve imediatamente", async () => {
      await expect(ds.load()).resolves.toBeUndefined();
    });

    it("é idempotente: chamar duas vezes mantém o mesmo snapshot", async () => {
      const productsBefore = ds.products;
      const clientsBefore = ds.clients;

      await ds.load();
      await ds.load();

      // Mesmas referências de snapshot e contagens estáveis.
      expect(ds.products).toBe(productsBefore);
      expect(ds.clients).toBe(clientsBefore);
      expect(ds.clientsOfProduct(DIESEL_S10).map((c) => c.id)).toEqual([1, 3]);
      expect(ds.productCountOfClient(1)).toBe(6);
    });
  });
});
