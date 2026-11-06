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

/**
 * CNPJ de um cliente: matriz + filiais. Enviado/armazenado SEM máscara
 * (14 caracteres alfanuméricos; o CNPJ alfanumérico vigora a partir de jul/2026).
 */
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

/**
 * `ProductResponseDto`.
 *
 * `clients` só vem em `GET /products/:id`, `POST` e `PATCH` — NÃO vem nas
 * listagens (`GET /products` e `GET /products/all`).
 */
export interface ProductResponse extends NestedProductResponse {
  clients?: NestedClientResponse[];
}

/**
 * `ClientResponseDto`.
 *
 * `products` só vem em `GET /clients/:id` e `PATCH` — NÃO vem em `POST`,
 * `GET /clients` nem `GET /clients/all`.
 */
export interface ClientResponse extends NestedClientResponse {
  updatedAt: string;
  products?: NestedProductResponse[];
}

/** Resposta paginada (`*PaginationResponseDto`). */
export interface PaginatedResponse<T> {
  rows: T[];
  /** Total de registros (não da página). */
  total: number;
}

/** Query de paginação (`page` base 1; `limit` entre 1 e 100). */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/** Resposta de `DELETE` em produtos e clientes. */
export interface DeleteResponse {
  success: boolean;
}

/** `POST /rest/products` (`CreateProductDto`). */
export interface CreateProductRequest {
  name: string;
  /** Único. */
  sapCode: string;
}

/** `PATCH /rest/products/{id}` (`UpdateProductDto`). */
export interface UpdateProductRequest {
  name?: string;
  sapCode?: string;
  /**
   * Substituição total dos clientes vinculados: omitido = não altera;
   * `[]` = remove todos; lista = vínculos passam a ser exatamente essa lista.
   */
  clientIds?: string[];
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
  /**
   * Substituição total dos produtos vinculados: omitido = não altera;
   * `[]` = remove todos; lista = vínculos passam a ser exatamente essa lista.
   * `cnpj.branches` também substitui todas as filiais quando enviado.
   */
  productIds?: string[];
}

/** Prefixo de rota dos controllers do mw-nave. */
export const REST_PREFIX = "/rest" as const;

/** Endpoints de produtos e clientes do mw-nave. */
export const PRODUCTS_ENDPOINTS = {
  /** `GET` — todos os produtos (sem paginação), SEM clientes aninhados. */
  products: `${REST_PREFIX}/products/all`,
  /** `GET` (paginado: `page`, `limit`) | `POST` — produtos. */
  productsRoot: `${REST_PREFIX}/products`,
  /** `GET` — todos os clientes (sem paginação), SEM produtos aninhados. */
  clients: `${REST_PREFIX}/clients/all`,
  /** `GET` (paginado: `page`, `limit`) — clientes. */
  clientsPaginated: `${REST_PREFIX}/clients`,
  /** `GET` (com clientes vinculados) `| PATCH | DELETE` — produto por UUID. */
  productById: (id: string): string =>
    `${REST_PREFIX}/products/${encodeURIComponent(id)}`,
  /** `POST` — cria cliente. */
  clientsCreate: `${REST_PREFIX}/clients`,
  /** `GET` (com produtos vinculados) `| PATCH | DELETE` — cliente por UUID. */
  clientById: (id: string): string =>
    `${REST_PREFIX}/clients/${encodeURIComponent(id)}`,
} as const;

/**
 * Remove a máscara do CNPJ, mantendo apenas caracteres alfanuméricos em
 * maiúsculas (suporta o CNPJ alfanumérico). É o formato a enviar para a API,
 * que salva o valor exatamente como recebido.
 */
export function normalizeCnpj(value: string): string {
  return value.replace(/[^0-9a-zA-Z]/g, "").toUpperCase();
}

/** Formata 14 caracteres como `AA.AAA.AAA/AAAA-DD` (outros valores passam direto). */
export function formatCnpj(value: string): string {
  const d = normalizeCnpj(value);
  if (d.length !== 14) return value;
  return d.replace(
    /^([0-9A-Z]{2})([0-9A-Z]{3})([0-9A-Z]{3})([0-9A-Z]{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

/** Aplica máscara progressiva de CNPJ (alfanumérico) enquanto o usuário digita. */
export function maskCnpj(value: string): string {
  return normalizeCnpj(value)
    .slice(0, 14)
    .replace(/^([0-9A-Z]{2})([0-9A-Z])/, "$1.$2")
    .replace(/^([0-9A-Z]{2})\.([0-9A-Z]{3})([0-9A-Z])/, "$1.$2.$3")
    .replace(/\.([0-9A-Z]{3})([0-9A-Z])/, ".$1/$2")
    .replace(/([0-9A-Z]{4})(\d)/, "$1-$2");
}

/**
 * Valida o CNPJ (numérico ou alfanumérico) pelo dígito verificador, com o
 * mesmo algoritmo do back-end (valor de cada caractere = código ASCII − 48).
 * Aceita valor com ou sem máscara.
 */
export function isValidCnpj(value: string): boolean {
  const cnpj = normalizeCnpj(value);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj)) return false;
  if (/^(.)\1{13}$/.test(cnpj)) return false;

  const check = (base: string): number => {
    let weight = base.length - 7;
    let sum = 0;
    for (const ch of base) {
      sum += (ch.charCodeAt(0) - 48) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const d1 = check(cnpj.slice(0, 12));
  const d2 = check(cnpj.slice(0, 12) + d1);
  return cnpj.endsWith(`${d1}${d2}`);
}
