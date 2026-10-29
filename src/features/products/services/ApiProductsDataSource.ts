import type { IHttpService } from "@core/http/models/IHttpService";
import type { Cliente } from "@shared/domain";

import {
  PRODUCTS_ENDPOINTS,
  type ClientResponse,
  type ClientsListResponse,
  type ProductResponse,
  type ProductsListResponse,
} from "./contract";
import type { ProductsDataSource } from "./ProductsDataSource";
import type { CatalogProduct, ProductClientLink } from "./ProductsService";

/**
 * Implementação da `ProductsDataSource` que consome a Products_API via HTTP.
 *
 * Hidrata um snapshot em memória a partir de `GET /rest/products` (produtos com
 * clientes aninhados) e `GET /rest/clients` (clientes com produtos aninhados),
 * mapeando o contrato (`ProductResponse`/`ClientResponse`) para os modelos do
 * front-end (`CatalogProduct`/`Cliente`). Os acessores síncronos leem desse
 * snapshot, preservando exatamente as assinaturas que a página já usa.
 *
 * Reconciliação de identificadores: o `Cliente.id` do front-end é `number`,
 * enquanto o contrato usa UUID (string). Cada UUID distinto recebe um id
 * numérico substituto estável, por ordem de inserção, mantido em mapas
 * bidirecionais internos à data source — a página continua tratando `Cliente.id`
 * como uma chave numérica opaca.
 */
export class ApiProductsDataSource implements ProductsDataSource {
  private _products: CatalogProduct[] = [];
  private _clients: Cliente[] = [];
  private _links: ProductClientLink[] = [];

  /** UUID do cliente → id numérico substituto. */
  private readonly uuidToSurrogate = new Map<string, number>();
  /** Id numérico substituto → UUID do cliente (inverso). */
  private readonly surrogateToUuid = new Map<number, string>();
  /** Próximo id substituto a ser atribuído (por ordem de inserção). */
  private nextSurrogate = 1;

  /** Indica se o snapshot já foi carregado (idempotência de `load()`). */
  private loaded = false;

  constructor(private readonly http: IHttpService) {}

  /** Catálogo de produtos carregado (snapshot). */
  get products(): CatalogProduct[] {
    return this._products;
  }

  /** Lista de clientes carregada (snapshot). */
  get clients(): Cliente[] {
    return this._clients;
  }

  /**
   * Hidrata o snapshot a partir da Products_API. Idempotente: uma segunda
   * chamada é um no-op e não refaz as requisições HTTP. Erros da camada HTTP
   * (`AppError`) são propagados para a fronteira de fetch da página.
   */
  async load(): Promise<void> {
    if (this.loaded) return;

    const [productsResp, clientsResp] = await Promise.all([
      this.http.get<ProductsListResponse>(PRODUCTS_ENDPOINTS.products),
      this.http.get<ClientsListResponse>(PRODUCTS_ENDPOINTS.clients),
    ]);

    const products = productsResp ?? [];
    const clients = clientsResp ?? [];

    // 1) Reconciliação de ids: semeia os substitutos a partir da ordem do
    //    endpoint de clientes...
    for (const client of clients) {
      this.surrogateFor(client.id);
    }
    // ...e também a partir de quaisquer clientes que apareçam apenas aninhados
    //    sob os produtos, para que todo cliente referenciado seja mapeado.
    for (const product of products) {
      for (const client of product.clients ?? []) {
        this.surrogateFor(client.id);
      }
    }

    // 2) Mapeia produtos e clientes para os modelos do front-end.
    this._products = products.map(toCatalogProduct);
    this._clients = clients.map((c) => this.toCliente(c));

    // 3) Constrói os vínculos N:N a partir de AMBAS as direções das relações
    //    aninhadas, de-duplicando (mesmo productId+clientId uma única vez).
    const seen = new Set<string>();
    const links: ProductClientLink[] = [];
    const addLink = (productId: string, clientUuid: string): void => {
      const clientId = this.surrogateFor(clientUuid);
      const key = `${productId}\u0000${clientId}`;
      if (seen.has(key)) return;
      seen.add(key);
      links.push({ productId, clientId });
    };

    for (const product of products) {
      for (const client of product.clients ?? []) {
        addLink(product.id, client.id);
      }
    }
    for (const client of clients) {
      for (const product of client.products ?? []) {
        addLink(product.id, client.id);
      }
    }

    this._links = links;
    this.loaded = true;
  }

  /** Clientes vinculados a um produto. */
  clientsOfProduct(productId: string): Cliente[] {
    return this._links
      .filter((v) => v.productId === productId)
      .map((v) => this.client(v.clientId))
      .filter((c): c is Cliente => !!c);
  }

  /** Produtos vinculados a um cliente. */
  productsOfClient(clientId: number): CatalogProduct[] {
    return this._links
      .filter((v) => v.clientId === clientId)
      .map((v) => this.product(v.productId))
      .filter((p): p is CatalogProduct => !!p);
  }

  /** Quantos clientes um produto atende. */
  clientCountOfProduct(productId: string): number {
    return this._links.filter((v) => v.productId === productId).length;
  }

  /** Quantos produtos um cliente possui. */
  productCountOfClient(clientId: number): number {
    return this._links.filter((v) => v.clientId === clientId).length;
  }

  // ─── Helpers internos ──────────────────────────────────────────────────────

  private product(id: string): CatalogProduct | undefined {
    return this._products.find((p) => p.id === id);
  }

  private client(id: number): Cliente | undefined {
    return this._clients.find((c) => c.id === id);
  }

  /**
   * Retorna o id numérico substituto estável para um UUID de cliente,
   * atribuindo um novo (por ordem de inserção) na primeira vez que o UUID é
   * visto.
   */
  private surrogateFor(uuid: string): number {
    const existing = this.uuidToSurrogate.get(uuid);
    if (existing !== undefined) return existing;

    const surrogate = this.nextSurrogate++;
    this.uuidToSurrogate.set(uuid, surrogate);
    this.surrogateToUuid.set(surrogate, uuid);
    return surrogate;
  }

  private toCliente(c: ClientResponse): Cliente {
    return {
      id: this.surrogateFor(c.id),
      codigo: c.codigo,
      razao: c.razaoSocial,
      cnpj: c.cnpj,
    };
  }
}

/** Mapeia a resposta de produto do contrato para o modelo do front-end. */
function toCatalogProduct(p: ProductResponse): CatalogProduct {
  return {
    id: p.id,
    name: p.name,
    abbreviation: p.abbreviation,
    sapCode: p.sapCode,
    color: p.color,
    group: p.group,
    active: p.active,
  };
}
