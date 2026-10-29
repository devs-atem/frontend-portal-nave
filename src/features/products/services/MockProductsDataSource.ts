import { CLIENTES, type Cliente } from "@shared/domain";

import type { ProductsDataSource } from "./ProductsDataSource";
import type { CatalogProduct, ProductClientLink } from "./ProductsService";

// ─── Catálogo (fixo) ─────────────────────────────────────────────────────────
const CATALOG: CatalogProduct[] = [
  { id: "aa51f146-d648-4187-ab54-f9c5a53e623f", name: "BIODIESEL", abbreviation: "B100", sapCode: "10295", color: "#d46edc", group: "Biodiesel", active: true },
  { id: "174c3e1e-a400-4b6c-98e7-c89824c58f6e", name: "ETANOL ANIDRO COMBUSTÍVEL", abbreviation: "Anidro", sapCode: "10045", color: "#2cfdad", group: "Etanol", active: true },
  { id: "74266e1b-253b-470d-a11e-8a133e06217c", name: "ETANOL HIDRATADO COMBUSTÍVEL", abbreviation: "Álcool", sapCode: "10059", color: "#2ef9f1", group: "Etanol", active: true },
  { id: "9a658c76-f079-4e88-a093-330cd66a700b", name: "GASOLINA A", abbreviation: "Gasolina A", sapCode: "10031", color: "#6f1790", group: "Gasolina", active: true },
  { id: "e607610d-b85c-4314-8b5b-23f838f9917a", name: "GASOLINA C ADITIVADA ATIVAMAX", abbreviation: "GASAA", sapCode: "10123", color: "#6fd6a0", group: "Gasolina", active: false },
  { id: "2890a02d-9ff4-41ef-83cd-96d0da3c1bd5", name: "GASOLINA C COMUM", abbreviation: "Gasolina C", sapCode: "10076", color: "#29fca7", group: "Gasolina", active: true },
  { id: "e9204631-a012-4340-a07c-d2ceae2a4e8c", name: "ÓLEO DIESEL A S10", abbreviation: "AS-10", sapCode: "10460", color: "#a18a9f", group: "Diesel", active: true },
  { id: "e2f0a3e5-255f-4e2b-bc95-a836e85dc3b0", name: "ÓLEO DIESEL A S1800", abbreviation: "Diesel AS1800", sapCode: "10028", color: "#12142d", group: "Diesel", active: true },
  { id: "3b85e1ee-afdb-4dc2-b755-43948e69adf1", name: "ÓLEO DIESEL A S500", abbreviation: "AS500", sapCode: "10093", color: "#370339", group: "Diesel S500", active: true },
  { id: "fbe6e5cb-3312-4325-8e17-0bcc27254d94", name: "ÓLEO DIESEL B S10 - BR", abbreviation: "DIESELBS10", sapCode: "10474", color: "#f1b88d", group: "Diesel S10", active: true },
  { id: "5b50b609-b853-45ab-816f-9d03811c864e", name: "ÓLEO DIESEL MARÍTIMO", abbreviation: "Diesel Marítimo", sapCode: "10277", color: "#9fcc49", group: "Diesel", active: true },
];

// ─── Vínculos produto ↔ cliente (N:N, mock determinístico) ───────────────────
// Clientes: 1 = Rio Negro, 2 = Distribuidora Amazonas, 3 = Solimões Energia.
const LINKS: ProductClientLink[] = [
  { productId: "aa51f146-d648-4187-ab54-f9c5a53e623f", clientId: 1 },
  { productId: "174c3e1e-a400-4b6c-98e7-c89824c58f6e", clientId: 1 },
  { productId: "174c3e1e-a400-4b6c-98e7-c89824c58f6e", clientId: 2 },
  { productId: "74266e1b-253b-470d-a11e-8a133e06217c", clientId: 2 },
  { productId: "9a658c76-f079-4e88-a093-330cd66a700b", clientId: 1 },
  { productId: "2890a02d-9ff4-41ef-83cd-96d0da3c1bd5", clientId: 1 },
  { productId: "2890a02d-9ff4-41ef-83cd-96d0da3c1bd5", clientId: 2 },
  { productId: "2890a02d-9ff4-41ef-83cd-96d0da3c1bd5", clientId: 3 },
  { productId: "e9204631-a012-4340-a07c-d2ceae2a4e8c", clientId: 1 },
  { productId: "e9204631-a012-4340-a07c-d2ceae2a4e8c", clientId: 3 },
  { productId: "e2f0a3e5-255f-4e2b-bc95-a836e85dc3b0", clientId: 2 },
  { productId: "3b85e1ee-afdb-4dc2-b755-43948e69adf1", clientId: 3 },
  { productId: "fbe6e5cb-3312-4325-8e17-0bcc27254d94", clientId: 2 },
  { productId: "fbe6e5cb-3312-4325-8e17-0bcc27254d94", clientId: 3 },
  { productId: "5b50b609-b853-45ab-816f-9d03811c864e", clientId: 1 },
];

/**
 * Implementação mock da `ProductsDataSource` baseada em dados mestres fixos em
 * memória (seeds `CATALOG`, `LINKS` e `CLIENTES`).
 *
 * É a fonte única da lógica/seed do mock: a classe `ProductsService` apenas a
 * estende para preservar os imports existentes. O comportamento dos acessores
 * síncronos é idêntico, byte a byte, ao `ProductsService` anterior.
 */
export class MockProductsDataSource implements ProductsDataSource {
  readonly products = CATALOG;
  readonly clients = CLIENTES;

  product(id: string): CatalogProduct | undefined {
    return this.products.find((p) => p.id === id);
  }

  client(id: number): Cliente | undefined {
    return this.clients.find((c) => c.id === id);
  }

  /** Clientes vinculados a um produto. */
  clientsOfProduct(productId: string): Cliente[] {
    return LINKS.filter((v) => v.productId === productId)
      .map((v) => this.client(v.clientId))
      .filter((c): c is Cliente => !!c);
  }

  /** Produtos vinculados a um cliente. */
  productsOfClient(clientId: number): CatalogProduct[] {
    return LINKS.filter((v) => v.clientId === clientId)
      .map((v) => this.product(v.productId))
      .filter((p): p is CatalogProduct => !!p);
  }

  /** Quantos clientes um produto atende. */
  clientCountOfProduct(productId: string): number {
    return LINKS.filter((v) => v.productId === productId).length;
  }

  /** Quantos produtos um cliente possui. */
  productCountOfClient(clientId: number): number {
    return LINKS.filter((v) => v.clientId === clientId).length;
  }

  /**
   * O snapshot já está presente em memória (seeds), portanto `load()` resolve
   * imediatamente. Idempotente: chamar duas vezes mantém o mesmo snapshot.
   */
  async load(): Promise<void> {
    // no-op: snapshot já carregado a partir das seeds.
  }
}
