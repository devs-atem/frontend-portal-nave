import type { IHttpService } from "@core/http/models/IHttpService";
import type { Cliente } from "@shared/domain";

import {
  PRODUCTS_ENDPOINTS,
  formatCnpj,
  type ClientResponse,
  type ClientsListResponse,
  type CreateProductRequest,
  type ProductResponse,
  type ProductsListResponse,
  type UpdateProductRequest,
} from "./contract";
import type {
  NewProductInput,
  ProductChanges,
  ProductsDataSource,
} from "./ProductsDataSource";
import type { CatalogProduct, ProductClientLink } from "./ProductsService";

/** Máximo de requisições de detalhe simultâneas durante o `load()`. */
export const DETAIL_CONCURRENCY = 6;

/** Executa as tarefas com no máximo `limit` em paralelo, preservando a ordem. */
async function runLimited<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array<T>(tasks.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, () => worker()),
  );
  return results;
}

/**
 * Implementação da `ProductsDataSource` que consome a Products_API via HTTP.
 *
 * Hidrata um snapshot a partir de `GET /rest/products/all` e
 * `GET /rest/clients/all` (listagens sem relações). Como a relação N:N é
 * simétrica, busca o detalhe só do lado com MENOS registros
 * (`GET /products/:id` ou `GET /clients/:id`), com concorrência limitada, e
 * deriva todos os vínculos dele. Qualquer falha de detalhe rejeita o `load()`
 * (sem snapshot parcial).
 *
 * Reconciliação de identificadores: o `Cliente.id` do front-end é `number`,
 * enquanto o contrato usa UUID. Cada UUID recebe um id numérico substituto
 * estável; toda escrita converte de volta com `clientUuidOf`.
 */
export class ApiProductsDataSource implements ProductsDataSource {
  private _products: CatalogProduct[] = [];
  private _clients: Cliente[] = [];
  private _links: ProductClientLink[] = [];

  private readonly uuidToSurrogate = new Map<string, number>();
  private readonly surrogateToUuid = new Map<number, string>();
  private nextSurrogate = 1;

  private loaded = false;

  constructor(private readonly http: IHttpService) {}

  get products(): CatalogProduct[] {
    return this._products;
  }

  get clients(): Cliente[] {
    return this._clients;
  }

  /** Hidrata o snapshot. Idempotente. */
  async load(): Promise<void> {
    if (this.loaded) return;

    const [productsResp, clientsResp] = await Promise.all([
      this.http.get<ProductsListResponse>(PRODUCTS_ENDPOINTS.products),
      this.http.get<ClientsListResponse>(PRODUCTS_ENDPOINTS.clients),
    ]);
    const products = productsResp ?? [];
    const clients = clientsResp ?? [];

    // Pares (productId, clientUuid) vindos do lado com menos registros.
    const pairs: [string, string][] = [];
    if (products.length <= clients.length) {
      const details = await runLimited(
        products.map(
          (p) => () =>
            this.http.get<ProductResponse>(PRODUCTS_ENDPOINTS.productById(p.id)),
        ),
        DETAIL_CONCURRENCY,
      );
      for (const d of details) {
        for (const c of d.clients ?? []) pairs.push([d.id, c.id]);
      }
    } else {
      const details = await runLimited(
        clients.map(
          (c) => () =>
            this.http.get<ClientResponse>(PRODUCTS_ENDPOINTS.clientById(c.id)),
        ),
        DETAIL_CONCURRENCY,
      );
      for (const d of details) {
        for (const p of d.products ?? []) pairs.push([p.id, d.id]);
      }
    }

    // Ids substitutos: primeiro pela ordem dos clientes, depois por clientes
    // que apareçam apenas nos vínculos.
    for (const c of clients) this.surrogateFor(c.id);
    for (const [, clientUuid] of pairs) this.surrogateFor(clientUuid);

    this._products = products.map(toCatalogProduct);
    this._clients = clients.map((c) => this.toCliente(c));

    const seen = new Set<string>();
    const links: ProductClientLink[] = [];
    for (const [productId, clientUuid] of pairs) {
      const clientId = this.surrogateFor(clientUuid);
      const key = `${productId}\u0000${clientId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ productId, clientId });
    }

    this._links = links;
    this.loaded = true;
  }

  /** Descarta o snapshot e recarrega da API. */
  async refresh(): Promise<void> {
    this.loaded = false;
    await this.load();
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

  // ─── Acessores síncronos ───────────────────────────────────────────────────

  clientsOfProduct(productId: string): Cliente[] {
    return this._links
      .filter((v) => v.productId === productId)
      .map((v) => this.client(v.clientId))
      .filter((c): c is Cliente => !!c);
  }

  productsOfClient(clientId: number): CatalogProduct[] {
    return this._links
      .filter((v) => v.clientId === clientId)
      .map((v) => this.product(v.productId))
      .filter((p): p is CatalogProduct => !!p);
  }

  clientCountOfProduct(productId: string): number {
    return this._links.filter((v) => v.productId === productId).length;
  }

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
      codigo: c.bp,
      razao: c.name,
      cnpj: formatCnpj(c.cnpj?.headquarters ?? ""),
    };
  }
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
function toCatalogProduct(p: ProductResponse): CatalogProduct {
  return {
    id: p.id,
    name: p.name,
    sapCode: p.sapCode,
    color: colorFor(p.id),
  };
}
