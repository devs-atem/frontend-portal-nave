/**
 * Contrato esperado da Products_API (lado front-end).
 *
 * Este módulo declara, em TypeScript puro, as formas de resposta que a
 * `ApiProductsDataSource` irá consumir. Representa a tipagem — no front-end — do
 * contrato que o back-end `mw-nave` deverá implementar; a implementação do
 * back-end em si está fora de escopo.
 *
 * Observações de projeto:
 * - Não há dependência de Zod aqui. O front-end usa `axios` + `IHttpService`; os
 *   DTOs Zod/nestjs-zod descritos no design são server-side (mw-nave).
 * - Os ids são UUIDs (string). O `id` de produto já é um UUID string no modelo
 *   do front-end (`CatalogProduct.id`), mapeando diretamente. Já o `id` de
 *   cliente precisa de reconciliação número↔UUID na data source, pois
 *   `Cliente.id` é `number` no front-end.
 * - O campo `razaoSocial` do cliente mapeia para o campo `razao` do front-end
 *   (`Cliente.razao`).
 *
 * Endpoints esperados (ver tabela de endpoints do design):
 * - `GET /rest/products` — coleção de produtos, cada um com clientes aninhados.
 * - `GET /rest/products/{id}` — produto único por UUID, com clientes aninhados.
 * - `GET /rest/products/search?name=` — produtos filtrados por termo de texto.
 * - `GET /rest/clients` — coleção de clientes, cada um com produtos aninhados.
 * - `GET /rest/clients/{id}` — cliente único por UUID, com produtos aninhados.
 *
 * Convenção de relações aninhadas (mw-nave):
 * - As relações aninhadas são opcionais (podem estar ausentes na resposta).
 * - As relações são rasas: os clientes aninhados de um produto NÃO re-aninham
 *   seus produtos, e os produtos aninhados de um cliente NÃO re-aninham seus
 *   clientes. Isso evita recursão ilimitada no contrato gerado.
 */

/**
 * Resposta de Produto da Products_API.
 *
 * Mapeamento → front-end (`CatalogProduct`):
 * - `id` → `id` (UUID string em ambos os lados).
 * - `name`, `abbreviation`, `sapCode`, `color`, `group`, `active` → campos
 *   homônimos.
 *
 * Consumida por `GET /rest/products`, `GET /rest/products/{id}` e
 * `GET /rest/products/search?name=`.
 */
export interface ProductResponse {
  /** Identificador do produto (UUID). Mapeia direto para `CatalogProduct.id`. */
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
  /** Status de ativo. */
  active: boolean;
  /** Timestamp de criação (ISO 8601), quando presente. */
  createdAt?: string;
  /** Timestamp de atualização (ISO 8601), quando presente. */
  updatedAt?: string;
  /**
   * Clientes vinculados ao produto (relação aninhada OPCIONAL e rasa). Os
   * clientes aqui não re-aninham seus próprios produtos.
   */
  clients?: ClientResponse[];
}

/**
 * Resposta de Cliente da Products_API.
 *
 * Mapeamento → front-end (`Cliente`):
 * - `codigo` → `codigo`.
 * - `razaoSocial` → `razao`.
 * - `cnpj` → `cnpj`.
 * - `id` (UUID) → `id` (number) via reconciliação número↔UUID na data source.
 *
 * Consumida por `GET /rest/clients` e `GET /rest/clients/{id}`.
 */
export interface ClientResponse {
  /**
   * Identificador do cliente (UUID). Precisa de reconciliação número↔UUID na
   * data source, pois `Cliente.id` é `number` no front-end.
   */
  id: string;
  /** Código do cliente. */
  codigo: string;
  /** Razão social. Mapeia para `Cliente.razao` no front-end. */
  razaoSocial: string;
  /** CNPJ. */
  cnpj: string;
  /** Timestamp de criação (ISO 8601), quando presente. */
  createdAt?: string;
  /** Timestamp de atualização (ISO 8601), quando presente. */
  updatedAt?: string;
  /**
   * Produtos vinculados ao cliente (relação aninhada OPCIONAL e rasa). Os
   * produtos aqui não re-aninham seus próprios clientes.
   */
  products?: ProductResponse[];
}

/**
 * Resposta de `GET /rest/products` (e de `GET /rest/products/search?name=`):
 * coleção de produtos, cada um com seus clientes aninhados (opcional).
 */
export type ProductsListResponse = ProductResponse[];

/**
 * Resposta de `GET /rest/clients`: coleção de clientes, cada um com seus
 * produtos aninhados (opcional).
 */
export type ClientsListResponse = ClientResponse[];

/**
 * Prefixo de rota do contrato, consistente com os controllers existentes do
 * mw-nave.
 */
export const REST_PREFIX = "/rest" as const;

/**
 * Endpoints esperados da Products_API, para uso pela data source. Mantidos
 * aqui para manter o contrato auto-documentado e centralizar os caminhos.
 */
export const PRODUCTS_ENDPOINTS = {
  /** `GET /rest/products` — coleção de produtos com clientes aninhados. */
  products: "/rest/products",
  /** `GET /rest/clients` — coleção de clientes com produtos aninhados. */
  clients: "/rest/clients",
  /** `GET /rest/products/{id}` — produto único por UUID. */
  productById: (id: string): string => `/rest/products/${id}`,
  /** `GET /rest/clients/{id}` — cliente único por UUID. */
  clientById: (id: string): string => `/rest/clients/${id}`,
  /** `GET /rest/products/search?name=` — busca de produtos por termo. */
  productsSearch: (name: string): string =>
    `/rest/products/search?name=${encodeURIComponent(name)}`,
} as const;
