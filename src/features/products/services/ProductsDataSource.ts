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

/** Parâmetros de paginação (`page` base 1). */
export interface PageQuery {
  page: number;
  limit: number;
}

/** Uma página de resultados + total geral (de todas as páginas). */
export interface PagedResult<T> {
  rows: T[];
  total: number;
}

/** Produto da página com seus clientes vinculados. */
export interface ProductWithClients {
  product: CatalogProduct;
  clients: Cliente[];
}

/** Cliente da página com seus produtos vinculados. */
export interface ClientWithProducts {
  client: Cliente;
  products: CatalogProduct[];
}

/**
 * Abstração da fonte de dados do módulo Products.
 *
 * A `ProductsPage` depende desta interface (resolvida via container IoC).
 * Cada visão carrega SOMENTE a página corrente (endpoints paginados) e, para
 * essa página, o detalhe necessário para obter os vínculos. As mutações
 * chamam a API e a página recarrega a página corrente em seguida.
 */
export interface ProductsDataSource {
  /**
   * Uma página de produtos (`GET /rest/products?page&limit`). Sem vínculos:
   * eles vêm de `getProductDetail`, só quando o usuário abre um produto.
   */
  loadProductsPage(q: PageQuery): Promise<PagedResult<CatalogProduct>>;
  /**
   * Uma página de clientes (`GET /rest/clients?page&limit`). Sem vínculos:
   * eles vêm de `getClientDetail`, só quando o usuário abre um cliente.
   */
  loadClientsPage(q: PageQuery): Promise<PagedResult<Cliente>>;
  /** Detalhe do produto com clientes vinculados (`GET /rest/products/:id`). */
  getProductDetail(productId: string): Promise<ProductWithClients>;
  /** Detalhe do cliente com produtos vinculados (`GET /rest/clients/:id`). */
  getClientDetail(clientId: number): Promise<ClientWithProducts>;
  /**
   * Todos os clientes (`GET /rest/clients/all`). Chamado sob demanda, apenas
   * pelo diálogo de vínculo (seletor de clientes).
   */
  listAllClients(): Promise<Cliente[]>;

  /**
   * Todos os produtos (`GET /rest/products/all`). Chamado sob demanda, apenas
   * pelo diálogo de vínculo do cliente (seletor de produtos).
   */
  listAllProducts(): Promise<CatalogProduct[]>;

  createProduct(input: NewProductInput): Promise<CatalogProduct>;
  updateProduct(id: string, changes: ProductChanges): Promise<CatalogProduct>;
  deleteProduct(id: string): Promise<void>;
  /**
   * Substitui TODOS os produtos vinculados a um cliente
   * (`PATCH /rest/clients/:id` com `productIds`). `[]` desvincula todos.
   */
  updateClientProducts(clientId: number, productIds: string[]): Promise<void>;

  /** Traduz o id numérico substituto do cliente para o UUID real. */
  clientUuidOf(clientId: number): string | undefined;
}
