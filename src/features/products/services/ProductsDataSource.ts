import type { Cliente } from "@shared/domain";
import type { CatalogProduct, ProductClientLink } from "./ProductsService";

// Reexporta os tipos de domínio do catálogo para que novos módulos possam
// importá-los a partir de `ProductsDataSource`.
export type { CatalogProduct, ProductClientLink };

/** Dados de um novo produto (`POST /rest/products`). */
export interface NewProductInput {
  name: string;
  sapCode: string;
}

/** Alterações de um produto (`PATCH /rest/products/:id`). */
export interface ProductChanges {
  name?: string;
  sapCode?: string;
  /**
   * UUIDs reais dos clientes vinculados. Substituição total: omitido = não
   * altera; `[]` = desvincula todos.
   */
  clientUuids?: string[];
}

/**
 * Abstração da fonte de dados do módulo Products.
 *
 * A `ProductsPage` depende desta interface (resolvida via container IoC). Os
 * acessores síncronos operam sobre um snapshot já carregado; as mutações
 * chamam a API e a página executa `refresh()` em seguida.
 */
export interface ProductsDataSource {
  /** Catálogo de produtos carregado (snapshot). */
  readonly products: CatalogProduct[];
  /** Lista de clientes carregada (snapshot). */
  readonly clients: Cliente[];

  /** Clientes vinculados a um produto. */
  clientsOfProduct(productId: string): Cliente[];
  /** Produtos vinculados a um cliente. */
  productsOfClient(clientId: number): CatalogProduct[];
  /** Quantos clientes um produto atende. */
  clientCountOfProduct(productId: string): number;
  /** Quantos produtos um cliente possui. */
  productCountOfClient(clientId: number): number;

  /** Hidrata o snapshot. Idempotente: chamar duas vezes produz o mesmo snapshot. */
  load(): Promise<void>;
  /** Descarta o snapshot e recarrega da API (usado após mutações). */
  refresh(): Promise<void>;

  createProduct(input: NewProductInput): Promise<CatalogProduct>;
  updateProduct(id: string, changes: ProductChanges): Promise<CatalogProduct>;
  deleteProduct(id: string): Promise<void>;

  /** Traduz o id numérico substituto do cliente para o UUID real. */
  clientUuidOf(clientId: number): string | undefined;
}
