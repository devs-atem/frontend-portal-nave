import type { IHttpService } from "@core/http/models/IHttpService";
import type { Cliente } from "@shared/domain";

import {
  PRODUCTS_ENDPOINTS,
  formatCnpj,
  type ClientResponse,
  type ClientsListResponse,
  type ClientsPaginationResponse,
  type CreateProductRequest,
  type NestedClientResponse,
  type NestedProductResponse,
  type PaginatedResponse,
  type ProductResponse,
  type ProductsListResponse,
  type ProductsPaginationResponse,
  type UpdateClientRequest,
  type UpdateProductRequest,
} from "./contract";
import type {
  ClientWithProducts,
  NewProductInput,
  PagedResult,
  PageQuery,
  ProductChanges,
  ProductsDataSource,
  ProductWithClients,
} from "./ProductsDataSource";
import type { CatalogProduct } from "./ProductsService";

/** Normaliza `{ rows, total }` (aceita também um array puro). */
function toPaged<T>(resp: PaginatedResponse<T> | T[] | undefined | null): {
  rows: T[];
  total: number;
} {
  if (!resp) return { rows: [], total: 0 };
  if (Array.isArray(resp)) return { rows: resp, total: resp.length };
  const rows = resp.rows ?? [];
  return { rows, total: resp.total ?? rows.length };
}

/**
 * Implementação da `ProductsDataSource` que consome a Products_API via HTTP.
 *
 * Carrega apenas a listagem paginada da página corrente (sem vínculos):
 * - `GET /rest/products?page&limit` e `GET /rest/clients?page&limit`.
 * - Os vínculos só são buscados sob demanda, ao abrir o painel lateral de um
 *   item: `GET /rest/products/:id` (`getProductDetail`) ou
 *   `GET /rest/clients/:id` (`getClientDetail`).
 * - `GET /rest/clients/all` só é chamado sob demanda (seletor do diálogo de
 *   vínculo), via `listAllClients()`.
 *
 * Reconciliação de identificadores: o `Cliente.id` do front-end é `number`,
 * enquanto o contrato usa UUID. Cada UUID recebe um id numérico substituto
 * estável; toda escrita converte de volta com `clientUuidOf`.
 */
export class ApiProductsDataSource implements ProductsDataSource {
  private readonly uuidToSurrogate = new Map<string, number>();
  private readonly surrogateToUuid = new Map<number, string>();
  private nextSurrogate = 1;

  constructor(private readonly http: IHttpService) {}

  // ─── Leitura paginada ──────────────────────────────────────────────────────

  /** Só a listagem paginada: os vínculos NÃO são buscados aqui (ver `getProductDetail`). */
  async loadProductsPage(q: PageQuery): Promise<PagedResult<CatalogProduct>> {
    const resp = await this.http.get<ProductsPaginationResponse>(
      PRODUCTS_ENDPOINTS.productsRoot,
      { page: q.page, limit: q.limit },
    );
    const { rows, total } = toPaged(resp);

    return { rows: rows.map(toCatalogProduct), total };
  }

  /** Só a listagem paginada: os vínculos NÃO são buscados aqui (ver `getClientDetail`). */
  async loadClientsPage(q: PageQuery): Promise<PagedResult<Cliente>> {
    const resp = await this.http.get<ClientsPaginationResponse>(
      PRODUCTS_ENDPOINTS.clientsPaginated,
      { page: q.page, limit: q.limit },
    );
    const { rows, total } = toPaged(resp);

    return { rows: rows.map((c) => this.toCliente(c)), total };
  }

  /** Detalhe de um produto (clientes vinculados) — chamado ao abrir o painel lateral. */
  async getProductDetail(productId: string): Promise<ProductWithClients> {
    const d = await this.http.get<ProductResponse>(
      PRODUCTS_ENDPOINTS.productById(productId),
    );
    return {
      product: toCatalogProduct(d),
      clients: this.uniqueClients(d.clients ?? []),
    };
  }

  /** Detalhe de um cliente (produtos vinculados) — chamado ao abrir o painel lateral. */
  async getClientDetail(clientId: number): Promise<ClientWithProducts> {
    const uuid = this.surrogateToUuid.get(clientId);
    if (!uuid) throw new Error(`Cliente desconhecido: ${clientId}`);
    const d = await this.http.get<ClientResponse>(
      PRODUCTS_ENDPOINTS.clientById(uuid),
    );
    return {
      client: this.toCliente(d),
      products: uniqueProducts(d.products ?? []).map(toCatalogProduct),
    };
  }
  async listAllClients(): Promise<Cliente[]> {
    const resp = await this.http.get<ClientsListResponse>(
      PRODUCTS_ENDPOINTS.clients,
    );
    const clients = resp ?? [];
    return clients.map((c) => this.toCliente(c));
  }

  async listAllProducts(): Promise<CatalogProduct[]> {
    const resp = await this.http.get<ProductsListResponse>(
      PRODUCTS_ENDPOINTS.products,
    );
    const products = resp ?? [];
    return products.map(toCatalogProduct);
  }

  /** `productIds` é substituição total; só ele é enviado (demais campos intactos). */
  async updateClientProducts(
    clientId: number,
    productIds: string[],
  ): Promise<void> {
    const uuid = this.surrogateToUuid.get(clientId);
    if (!uuid) throw new Error(`Cliente desconhecido: ${clientId}`);
    const body: UpdateClientRequest = { productIds };
    await this.http.patch<ClientResponse>(
      PRODUCTS_ENDPOINTS.clientById(uuid),
      body,
    );
  }

  // ─── Escrita ───────────────────────────────────────────────────────────────

  async createProduct(input: NewProductInput): Promise<CatalogProduct> {
    const body: CreateProductRequest = {
      name: input.name,
      sapCode: input.sapCode,
    };
    const created = await this.http.post<ProductResponse>(
      PRODUCTS_ENDPOINTS.productsRoot,
      body,
    );
    return toCatalogProduct(created);
  }

  /** Só envia as chaves definidas; `clientIds` é substituição total. */
  async updateProduct(
    id: string,
    changes: ProductChanges,
  ): Promise<CatalogProduct> {
    const body: UpdateProductRequest = {
      ...(changes.name !== undefined ? { name: changes.name } : {}),
      ...(changes.sapCode !== undefined ? { sapCode: changes.sapCode } : {}),
      ...(changes.clientUuids !== undefined
        ? { clientIds: changes.clientUuids }
        : {}),
    };
    const updated = await this.http.patch<ProductResponse>(
      PRODUCTS_ENDPOINTS.productById(id),
      body,
    );
    return toCatalogProduct(updated);
  }

  async deleteProduct(id: string): Promise<void> {
    await this.http.delete(PRODUCTS_ENDPOINTS.productById(id));
  }

  clientUuidOf(clientId: number): string | undefined {
    return this.surrogateToUuid.get(clientId);
  }

  // ─── Helpers internos ──────────────────────────────────────────────────────

  private surrogateFor(uuid: string): number {
    const existing = this.uuidToSurrogate.get(uuid);
    if (existing !== undefined) return existing;

    const surrogate = this.nextSurrogate++;
    this.uuidToSurrogate.set(uuid, surrogate);
    this.surrogateToUuid.set(surrogate, uuid);
    return surrogate;
  }

  private uniqueClients(list: NestedClientResponse[]): Cliente[] {
    const seen = new Set<string>();
    const out: Cliente[] = [];
    for (const c of list) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push(this.toCliente(c));
    }
    return out;
  }

  private toCliente(c: NestedClientResponse): Cliente {
    return {
      id: this.surrogateFor(c.id),
      codigo: c.bp,
      razao: c.name,
      cnpj: formatCnpj(c.cnpj?.headquarters ?? ""),
    };
  }
}

function uniqueProducts(list: NestedProductResponse[]): NestedProductResponse[] {
  const seen = new Set<string>();
  return list.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

/** Paleta usada para a "bolinha" do produto (a API não expõe cor). */
const PRODUCT_PALETTE = [
  "#0D265E",
  "#F39200",
  "#1E8E5A",
  "#7A4FB5",
  "#C2410C",
  "#0E7490",
  "#B42F2F",
  "#5B6475",
];

/** Cor estável derivada do id do produto. */
function colorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return PRODUCT_PALETTE[Math.abs(hash) % PRODUCT_PALETTE.length];
}

/** Mapeia a resposta de produto do contrato (id, name, sapCode) para o front-end. */
function toCatalogProduct(p: NestedProductResponse): CatalogProduct {
  return {
    id: p.id,
    name: p.name,
    sapCode: p.sapCode,
    color: colorFor(p.id),
  };
}
