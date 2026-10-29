import type { Cliente } from "@shared/domain";
import type { CatalogProduct, ProductClientLink } from "./ProductsService";

// Reexporta os tipos de domínio do catálogo para que novos módulos (mock/api)
// possam importá-los a partir de `ProductsDataSource` sem quebrar os imports
// existentes de `ProductsService`.
export type { CatalogProduct, ProductClientLink };

/**
 * Abstração da fonte de dados do módulo Products.
 *
 * A `ProductsPage` depende desta interface (resolvida via container IoC) em vez
 * do serviço concreto, permitindo trocar a implementação mock em memória por um
 * cliente de API real sem alterar o componente de página.
 *
 * Os acessores síncronos preservam exatamente as assinaturas que a página já
 * utiliza hoje, operando sobre um snapshot já carregado.
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

  /**
   * Hidrata o snapshot. O mock resolve imediatamente; a implementação de API
   * busca os dados via HTTP. Idempotente: chamar duas vezes produz o mesmo
   * snapshot.
   */
  load(): Promise<void>;
}
