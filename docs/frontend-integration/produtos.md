# Integração Front — Tela de Produtos

> Base URL: `/rest`. Todas as rotas exigem `Authorization: Bearer <JWT Cognito>`.

## 1. Modelo de dados

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `id` | uuid | gerado | |
| `sapCode` | string | sim | **único**, min 1 |
| `name` | string | sim | min 1 (não é único) |
| `clients` | LinkedClient[] | só no detalhe | clientes vinculados |
| `createdAt` / `updatedAt` | ISO-8601 | resposta | |

`LinkedClient` = `{ id, name, bp, cnpj: { headquarters, branches[] }, isActive, createdAt }`.

## 2. Endpoints

| Método | URL | Descrição |
|---|---|---|
| `POST` | `/rest/products` | Cria (201) |
| `GET` | `/rest/products?page&limit` | Lista paginada (sem `clients`) |
| `GET` | `/rest/products/all` | Lista completa sem paginação (sem `clients`) |
| `GET` | `/rest/products/:id` | Detalhe (com `clients`) |
| `PATCH` | `/rest/products/:id` | Atualização parcial |
| `DELETE` | `/rest/products/:id` | Exclusão (200 `{ "success": true }`) |

### 2.1 Criar — `POST /rest/products`

```json
{ "name": "Diesel S10", "sapCode": "000000000012345" }
```
Resposta 201: `{ "id", "sapCode", "name", "clients": [], "createdAt", "updatedAt" }`.

### 2.2 Listar — `GET /rest/products?page=1&limit=10`
`limit` default 10, máx 100. Resposta `{ "rows": [...], "total": N }`. Sem filtros/ordenação.

### 2.3 Atualizar — `PATCH /rest/products/:id`

```json
{
  "name": "Diesel S10 Aditivado",
  "sapCode": "000000000012345",
  "clientIds": ["uuid-cliente-1", "uuid-cliente-2"]
}
```

| Campo | Se ausente | Se enviado |
|---|---|---|
| `clientIds` | não altera | **substitui todos** os vínculos; `[]` desvincula todos |

Para adicionar um cliente, envie a lista completa. `clientIds` repetidos → 409. Cliente inexistente → 404.

### 2.4 Excluir — `DELETE /rest/products/:id`

- Remove em cascata vínculos com clientes e com owners (`OwnerProduct`).
- **Se o produto já foi usado em item de contrato, o banco bloqueia a exclusão.** Hoje isso retorna **500** (erro não tratado no back, código Prisma P2003), não um 409 amigável. **O front deve tratar 500 no DELETE exibindo "Produto em uso em contratos"** e, idealmente, pedimos correção no back para devolver 409.

## 3. Erros

| Status | Quando |
|---|---|
| 400 | Validação Zod |
| 401 | Sem token |
| 404 | Produto ou cliente (em `clientIds`) inexistente |
| 409 | `A product with sapCode "<x>" already exists`, `clientIds` repetido, vínculo duplicado |
| 500 | Delete de produto usado em contrato (ver 2.4) |

## 4. Relações

- **Produto ↔ Cliente (N:N)**: cadastral, via `clientIds` (aqui) ou `productIds` (em `PATCH /clients/:id`). Substituição total nos dois lados.
- **Produto ↔ Owner (`OwnerProduct`)**: habilita o produto para o depositante e guarda o rótulo do cliente (`customerProductCode`, `customerProductDescription`). **É pré-requisito para usar o produto em contrato.** Ver `contratos.md`.
- **Produto → Contrato**: via itens da revisão do contrato (`ContractRevisionItem`). Não há tabela direta contrato-produto.
- No contrato, `productCode` do item **deve ser igual ao `sapCode`** do produto.

### Efeitos colaterais importantes
- Todo `PATCH /products/:id` **republica o evento `custody.contract.updated`** de todos os contratos que usam o produto (mesmo sem mudança de campos).
- Alterar `sapCode` **não** atualiza o `productCode` já gravado nos itens de contratos existentes (a coluna é copiada). Evite alterar `sapCode` de produto em uso.

## 5. Checklist do front
- [ ] Bloquear/avisar edição de `sapCode` quando o produto estiver em uso.
- [ ] No PATCH de `clientIds`, enviar lista completa.
- [ ] Tratar 409 de `sapCode` duplicado no formulário.
- [ ] Tratar falha de exclusão (500) com mensagem de "produto em uso".
