/**
 * Contrato da API `mw-nave` (lado front-end) para produtos e clientes.
 *
 * Tipagem espelhada do OpenAPI publicado em
 * `https://mw-nave-dev.grupoatem.com.br/api/docs-json`.
 *
 * - Ids são UUID (string).
 * - Relações aninhadas são rasas: os clientes de um produto não re-aninham
 *   produtos, e vice-versa.
 * - Os caminhos incluem o prefixo `/rest`; a `baseURL` do http
 *   (`appConfig.api.url`) é apenas o host (ex.: `https://mw-nave-dev.grupoatem.com.br`).
 */

/** CNPJ de um cliente: matriz + filiais (somente dígitos, 14 caracteres). */
export interface ClientCnpj {
  headquarters: string;
  branches: string[];
}

/** Cliente aninhado em um produto (sem `products`). */
export interface NestedClientResponse {
  id: string;
  name: string;
  /** Business Partner (SAP). */
  bp: string;
  cnpj: ClientCnpj;
  isActive: boolean;
  createdAt: string;
}

/** Produto aninhado em um cliente (sem `clients`). */
export interface NestedProductResponse {
  id: string;
  sapCode: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/** `ProductResponseDto`. */
export interface ProductResponse extends NestedProductResponse {
  clients?: NestedClientResponse[];
}

/** `ClientResponseDto`. */
export interface ClientResponse extends NestedClientResponse {
  updatedAt: string;
  products?: NestedProductResponse[];
}

/** Resposta paginada (`*PaginationResponseDto`). */
export interface PaginatedResponse<T> {
  rows: T[];
  total: number;
}

/** `GET /rest/products/all`. */
export type ProductsListResponse = ProductResponse[];

/** `GET /rest/clients/all`. */
export type ClientsListResponse = ClientResponse[];

/** `POST /rest/clients` (`CreateClientDto`). */
export interface CreateClientRequest {
  name: string;
  bp: string;
  cnpj: { headquarters: string; branches?: string[] };
  isActive?: boolean;
}

/** `PATCH /rest/clients/{id}` (`UpdateClientDto`). */
export interface UpdateClientRequest {
  name?: string;
  bp?: string;
  cnpj?: { headquarters?: string; branches?: string[] };
  isActive?: boolean;
  /** Substitui os produtos vinculados ao cliente. */
  productIds?: string[];
}

/** Prefixo de rota dos controllers do mw-nave. */
export const REST_PREFIX = "/rest" as const;

/** Endpoints de produtos e clientes do mw-nave. */
export const PRODUCTS_ENDPOINTS = {
  /** `GET` — todos os produtos (sem paginação), com clientes aninhados. */
  products: `${REST_PREFIX}/products/all`,
  /** `GET` — todos os clientes (sem paginação), com produtos aninhados. */
  clients: `${REST_PREFIX}/clients/all`,
  /** `GET | PATCH | DELETE` — produto por UUID. */
  productById: (id: string): string =>
    `${REST_PREFIX}/products/${encodeURIComponent(id)}`,
  /** `POST` — cria cliente. */
  clientsCreate: `${REST_PREFIX}/clients`,
  /** `GET | PATCH | DELETE` — cliente por UUID. */
  clientById: (id: string): string =>
    `${REST_PREFIX}/clients/${encodeURIComponent(id)}`,
} as const;

/** Formata 14 dígitos como `00.000.000/0000-00` (outros valores passam direto). */
export function formatCnpj(value: string): string {
  const d = value.replace(/\D/g, "");
  if (d.length !== 14) return value;
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}
