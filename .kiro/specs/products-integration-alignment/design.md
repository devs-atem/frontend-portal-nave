# Design — Products Integration Alignment

## Visão geral

Transforma a tela de Produtos de somente-leitura com campos fictícios em uma tela alinhada a `docs/frontend-integration/produtos.md`: modelo fiel à API, carga eficiente dos vínculos, CRUD de produto, edição de vínculos com clientes (Full_Replace), tratamento do delete em uso e controle de escrita. Mantém o padrão da spec anterior (`products-page-alignment`): página → `ProductsDataSource` (IoC `products`) → `IHttpService`.

**Não-objetivos:** back-end; OwnerProduct/contratos (spec 3); grupo/sigla/status de produto.

### Estado atual verificado

- `ApiProductsDataSource` mantém snapshot (`_products`, `_clients`, `_links`) e mapas bidirecionais UUID ↔ id numérico (`Cliente.id` é `number` no domínio compartilhado).
- `load()` faz N+1 em `/products/:id`.
- `toCatalogProduct` fabrica `abbreviation`, `group`, `active`.
- `ProductsPage` já tem `CustomTabs`, `Select`, `Table`, `Skeleton`, `StatusTag`, painel lateral (`selected`) e CSS `ProductsPage.css`.

## Arquitetura

```mermaid
graph TD
  Page[ProductsPage] -->|useIoC products| DS[ProductsDataSource]
  DS --> Api[ApiProductsDataSource]
  Api --> Http[IHttpService]
  Http --> P[(/rest/products?page, /rest/products/all, /rest/products/:id)]
  Http --> C[(/rest/clients?page, /rest/clients/all, /rest/clients/:id)]
  Page --> Auth[authByPermission products:write]
```

## Componentes e interfaces

### `CatalogProduct` (reduzido)

```ts
export interface CatalogProduct {
  id: string;
  name: string;
  sapCode: string;
  /** Apenas visual, derivado do id. */
  color: string;
}
```

`abbreviation`, `group` e `active` são removidos do tipo. Os usos em `ProductsPage`, `ProductsPage.css` (tags de grupo `nm-prod__tag--*`) e testes existentes são ajustados (tarefa dedicada). `ProductClientLink` permanece.

### `ProductsDataSource` (como implementado)

> **Revisado após a implementação:** o desenho original mantinha um snapshot completo (`products`, `clients`, `clientsOfProduct`…), com `load()` idempotente e `refresh()`. Ele foi substituído por métodos de página + detalhe sob demanda, sem snapshot. A fonte de verdade é `src/features/products/services/ProductsDataSource.ts`.

```ts
export interface ProductsDataSource {
  /** `GET /rest/products?page&limit` — sem vínculos. */
  loadProductsPage(q: PageQuery): Promise<PagedResult<CatalogProduct>>;
  /** `GET /rest/clients?page&limit` — sem vínculos. */
  loadClientsPage(q: PageQuery): Promise<PagedResult<Cliente>>;
  /** `GET /rest/products/:id` — clientes vinculados, ao abrir o painel. */
  getProductDetail(productId: string): Promise<ProductWithClients>;
  /** `GET /rest/clients/:id` — produtos vinculados, ao abrir o painel. */
  getClientDetail(clientId: number): Promise<ClientWithProducts>;
  /** `/all` só para os seletores dos diálogos de vínculo. */
  listAllClients(): Promise<Cliente[]>;
  listAllProducts(): Promise<CatalogProduct[]>;

  createProduct(input: NewProductInput): Promise<CatalogProduct>;
  updateProduct(id: string, changes: ProductChanges): Promise<CatalogProduct>; // clientUuids omitido = não altera
  deleteProduct(id: string): Promise<void>;
  /** `PATCH /rest/clients/:id` com `productIds` (substituição total). */
  updateClientProducts(clientId: number, productIds: string[]): Promise<void>;

  /** Tradução id numérico substituto → UUID real (uso interno de mutações). */
  clientUuidOf(clientId: number): string | undefined;
}
```

A página converte a seleção de clientes (ids numéricos) em UUIDs por `clientUuidOf` antes de chamar `updateProduct`, mantendo os ids substitutos confinados ao data source. Se algum id não tiver UUID, a operação é abortada com mensagem (descartar o id apagaria o vínculo, por ser substituição total).

### Carga paginada com detalhe sob demanda (Requisito 2)

```text
abrir a tela / trocar página ou visão:
  "Por produto" → GET /products?page&limit
  "Por cliente" → GET /clients?page&limit
  falha → mensagem + "Tentar novamente"

abrir o painel de um item:
  produto → GET /products/:id   (clients)
  cliente → GET /clients/:id    (products)
  falha → painel em estado de erro (sem vínculos parciais)
  respostas fora de ordem são descartadas (id da última requisição)

abrir diálogo de vínculo:
  GET /clients/all ou GET /products/all (seletor)
```

Não há pool de concorrência: a carga inicial faz uma requisição por visão, e o detalhe é de um item por vez. GETs idênticos em andamento são deduplicados em `AxiosHttpService` (StrictMode em dev).

### Escrita

- `createProduct` → `POST PRODUCTS_ENDPOINTS.productsRoot` com `CreateProductRequest`.
- `updateProduct` → `PATCH productById(id)` com apenas as chaves definidas; `clientUuids` vira `clientIds`.
- `deleteProduct` → `DELETE productById(id)`. Erros HTTP propagam como `AppError`; quem decide a mensagem é a página.
- Após qualquer mutação bem-sucedida, a página chama o seu `refresh` (fecha o painel e recarrega a página corrente).

### Mensagens de erro

```ts
function productErrorMessage(err: unknown, op: "save" | "delete"): string {
  const status = (err as AppError | null)?.status;
  const msg = err instanceof Error ? err.message : "";
  if (op === "delete" && (status === 500 || status === 409))
    return "Produto em uso em contratos e não pode ser excluído.";
  if (status === 409 && msg) return msg;   // PT, vem da API
  if (status === 404) return "Produto não encontrado.";
  if (status === 400) return "Dados inválidos. Revise os campos informados.";
  return msg || "Não foi possível concluir a operação.";
}
```

### UI

- **Tabela**: colunas Produto/Cliente, Código SAP / CNPJ, Código (BP), "Clientes/Produtos" (contagem). Remove coluna Grupo, filtros de grupo/status, `clearFilters` ajustado só para busca.
- **Ações por linha-pai de produto** (com Write_Permission): Editar, Vínculos, Excluir. Linha-pai de cliente: nenhuma ação (cliente é editado na spec 1).
- **Modal de produto** (criar/editar): `name`, `sapCode`; aviso de impacto ao alterar `sapCode` (confirmação em segunda etapa).
- **Modal de vínculos**: lista de clientes com checkbox e busca; envia Full_Replace; texto de ajuda do Requisito 5.7.
- **Exclusão**: modal de confirmação com texto de cascata (clientes + OwnerProduct).

## Modelo de dados e mapeamento

| API | Front |
|---|---|
| `ProductResponse.id` | `CatalogProduct.id` |
| `name` | `name` |
| `sapCode` | `sapCode` |
| (derivado do `id`) | `color` |
| `clients[]` (detalhe) | `ProductClientLink` via UUID → id substituto |
| `ClientResponse.bp` | `Cliente.codigo` |
| `ClientResponse.name` | `Cliente.razao` |
| `cnpj.headquarters` | `Cliente.cnpj` (formatado) |

## Decisões e riscos

- **Remover campos fictícios** reduz confusão mas altera a UI existente (filtros some). Registrado como decisão no Requisito 1.
- **N+1 eliminado na carga inicial**: com a listagem paginada, a tela não busca detalhe por item; o detalhe vem só do item aberto. Incluir relações nas listagens continua como pedido ao back (mostraria contagens sem abrir o painel).
- **Busca só na página corrente**: a API paginada não aceita termo de busca; a busca filtra apenas os itens carregados.
- **Aviso de `sapCode` sempre exibido**: o front não sabe se o produto está em contrato; consultar a spec 3 para "produto em uso" fica como melhoria.
- **Delete em uso (500)**: tratado no front; correção para 409 é pedido ao back. A página trata 500 e 409 igualmente.
- **Ids numéricos substitutos** nunca vão para a API: toda escrita passa por `clientUuidOf`.
- **Permissão de escrita** é só UX enquanto o back não aplicar RBAC por rota.

## Estratégia de testes

Vitest com `http` mockado: listagem paginada sem `/all` nem detalhe por item, detalhe sob demanda (produto e cliente), falha em detalhe, reconciliação de ids substitutos, ausência de campos fictícios, `updateProduct` com/sem `clientIds`, `updateClientProducts`, delete com 500, `productErrorMessage` por status. Deduplicação de GET em `AxiosHttpService.test.ts` e redirect da raiz em `HomeRedirect.test.tsx`.
