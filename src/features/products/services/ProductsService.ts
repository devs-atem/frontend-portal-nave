import { MockProductsDataSource } from "./MockProductsDataSource";

/**
 * Produto do catálogo (dados mestres, fixos).
 * Shape reduzido ao essencial para o portal: identificação + grupo + cor.
 */
export interface CatalogProduct {
  id: string;
  /** Nome completo (ex.: "ÓLEO DIESEL A S10"). */
  name: string;
  /** Sigla/abreviação (ex.: "AS-10"). */
  abbreviation: string;
  /** Código SAP. */
  sapCode: string;
  /** Cor representativa (hex). */
  color: string;
  /** Grupo do produto (ex.: "Diesel"). */
  group: string;
  active: boolean;
}

/** Vínculo N:N entre produto e cliente. */
export interface ProductClientLink {
  productId: string;
  clientId: number;
}

/**
 * Service do módulo Products (dados mestres fixos).
 *
 * A lógica e as seeds em memória vivem agora em `MockProductsDataSource`, que é
 * a fonte única do mock. `ProductsService` permanece como alias dessa
 * implementação para preservar os imports existentes (`new ProductsService()`
 * em `module.tsx`, `import type { CatalogProduct }` em `ProductsPage.tsx`).
 *
 * Expõe o catálogo e a relação N:N produto↔cliente, permitindo navegar nos dois
 * sentidos: clientes de um produto e produtos de um cliente.
 */
export class ProductsService extends MockProductsDataSource {}
