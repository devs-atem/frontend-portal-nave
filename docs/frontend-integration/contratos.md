# Integração Front — Tela de Contratos

> Base URL: `/rest`. Todas as rotas exigem `Authorization: Bearer <JWT Cognito>`.
> Diferente de clientes/produtos, contratos têm **RBAC** (403) e **escopo de dados** por base/CNPJ.

## 1. Conceito e relações

```
Owner (depositante) 1─N Contract 1─N ContractRevision 1─N ContractRevisionItem ─N:1─ Product
                                                                                └─N:1─ Pool
Contract N:1 OperationalBase (source + baseCode)
Owner N:N Product (OwnerProduct)  ← pré-requisito para o item de contrato
Client ··(CNPJ, lógico)·· Owner
```

- O contrato **não** referencia `Client`; referencia **Owner** (`ownerId`). O cliente enxerga seus contratos pelo CNPJ (ver `clientes.md`).
- Os produtos do contrato são os **itens da revisão**. Cada item = produto + pool + regras de cota/capacidade.
- Revisão sem `approvedAt` = rascunho. Revisão vigente = `currentRevision`.

### Pré-requisitos para criar/editar um contrato (o front deve garantir nos seletores)
1. **Owner** existe e está `ACTIVE` → `GET /rest/owners?status=ACTIVE`.
2. **Base operacional** (`source` + `baseCode`) existe e está ativa.
3. Para cada item:
   - Produto existe e `productCode === Product.sapCode`.
   - Produto **vinculado ao Owner** (`OwnerProduct`) → `GET /rest/owners/:ownerId/products`; senão 400 `Product "<id>" is not linked to the Owner`.
   - Produto ativo na base (produto operacional ativo).
   - **Pool** da mesma base, ativo, com vigência cobrindo a revisão, e que **permita o produto** (400 `Pool does not allow the product`).
   - Um mesmo produto só pode aparecer **uma vez por pool** na revisão.

> Fluxo de UI sugerido: escolher Owner → carregar produtos do Owner (`/owners/:id/products`) → escolher base → escolher pool → item.

### Endpoints de apoio (Owner)
| Método | URL |
|---|---|
| `GET` | `/rest/owners?page&limit&status&internalCode&cnpj` |
| `GET` | `/rest/owners/:id` |
| `POST` | `/rest/owners` |
| `PATCH` | `/rest/owners/:id` |
| `PATCH` | `/rest/owners/:id/status` |
| `GET`/`POST` | `/rest/owners/:ownerId/products` |
| `PATCH`/`DELETE` | `/rest/owners/:ownerId/products/:productId` |

`POST /rest/owners/:ownerId/products` body: `{ "productId": "uuid", "customerProductCode": "DSL-S10", "customerProductDescription": "Diesel S10 do cliente" }` — **ao menos um** dos dois rótulos é obrigatório (400); duplicado → 409 `Owner product already exists`.
Owner: `cnpj` é normalizado/validado no back; exige ≥1 contato e ≥1 `isResponsible`; cada contato exige e-mail ou telefone.
(Endpoints de Pool/Base não foram mapeados aqui — confirmar com o back como listar pools e bases.)

## 2. Endpoints do contrato

| Método | URL | Permissão RBAC | Efeito |
|---|---|---|---|
| `POST` | `/contracts` | `app:custody:contract:write` | Cria rascunho (201) |
| `GET` | `/contracts` | `app:custody:contract:read` | Lista paginada |
| `GET` | `/contracts/:id` | read | Detalhe com revisões/itens |
| `PATCH` | `/contracts/:id` | write | **Substitui** o rascunho inteiro (só `DRAFT`) |
| `POST` | `/contracts/:id/submit` | write | DRAFT → PENDING_APPROVAL |
| `POST` | `/contracts/:id/approve` | `app:custody:contract:approve` | PENDING_APPROVAL → ACTIVE |
| `POST` | `/contracts/:id/suspend` | `app:custody:contract:status` | ACTIVE → SUSPENDED |
| `POST` | `/contracts/:id/reactivate` | status | SUSPENDED → ACTIVE |
| `POST` | `/contracts/:id/start-closing` | status | → CLOSING |
| `POST` | `/contracts/:id/close` | status | CLOSING → CLOSED |
| `POST` | `/contracts/:id/cancel` | status | → CANCELLED |
| `POST` | `/contracts/:id/revisions` | write | Cria revisão futura já aprovada |

Não existe DELETE de contrato. As ações `POST` respondem **201** (default Nest) — não dependa do 200 do Swagger; trate qualquer 2xx.

### 2.1 Listar — `GET /rest/contracts`

Query (estrita: parâmetro desconhecido → 400): `page` (≥1, default 1), `limit` (1..100, default 10 — fora da faixa dá **400**, diferente de clientes), `source`, `baseCode`, `ownerId` (uuid), `status`, `internalCode`, `contractNumber`.
Filtros são de **igualdade exata** (sem busca parcial). Ordenação fixa: `updatedAt desc`.

```
GET /rest/contracts?page=1&limit=20&status=ACTIVE&baseCode=SSA&ownerId=<uuid>
```
Resposta: `{ "rows": [Contract], "total": N }`.

**Escopo:** usuário sem escopo global só vê contratos das suas bases/CNPJs. Sem escopo → `{ rows: [], total: 0 }` (não é 403). Filtro fora do escopo também volta vazio.

### 2.2 Criar / Editar rascunho — `POST /contracts` e `PATCH /contracts/:id`

Mesmo body (`.strict()`: campo extra → 400). O PATCH é **substituição completa** (reenvie tudo, inclusive todos os itens).

```json
{
  "internalCode": "CT-2026-001",
  "contractNumber": "4600001234",
  "ownerId": "uuid-owner",
  "source": "<source da base>",
  "baseCode": "SSA",
  "effectiveFrom": "2026-01-01T00:00:00.000Z",
  "effectiveTo": "2026-12-31T23:59:59.000Z",
  "revision": {
    "effectiveFrom": "2026-01-01T00:00:00.000Z",
    "effectiveUntil": "2026-12-31T23:59:59.000Z",
    "justification": "Contrato inicial",
    "items": [
      {
        "productId": "uuid-produto",
        "productCode": "000000000012345",
        "customerProductCode": "DSL-S10",
        "customerProductDescription": "Diesel S10 do cliente",
        "poolId": "uuid-pool",
        "accountingMeasure": "GSV",
        "reservedCapacity": "1000.000",
        "maximumCapacity": "1500.000",
        "minimumQuota": "100.000",
        "maximumQuota": "500.000",
        "minimumStock": "50.000",
        "movementLimit": "300.000",
        "movementQuantityTolerancePercent": "2.5000",
        "quotaAlertPercent": "90",
        "allowedMovementTypeCodes": ["ENTRADA", "SAIDA"],
        "allowedTankCodes": ["TQ-01"]
      }
    ]
  }
}
```

**Regras de formato**
- Datas: ISO-8601 UTC (`.toISOString()`). `effectiveTo` / `revision.effectiveUntil`: `null` ou omitido = indeterminado.
- Quantidades: **string** (nunca number), regex `^(0|[1-9]\d*)(\.\d{1,3})?$` — não negativo, até 3 casas, ponto como separador.
- Percentuais (`movementQuantityTolerancePercent`, `quotaAlertPercent`): **string**, até 4 casas, ≤ 100.
- `accountingMeasure`: `GOV` | `GSV` | `MASS`.
- `revision.items`: mínimo 1. `allowedMovementTypeCodes`: mínimo 1. `allowedTankCodes`: pode ser `[]`.
- Opcionais: `effectiveTo`, `revision.justification`, `customerProductCode`, `customerProductDescription`, `minimumQuota`, `minimumStock`, `movementLimit`, `movementQuantityTolerancePercent`, `quotaAlertPercent`.
- `customerProductCode/Description`: prefill com os rótulos do `OwnerProduct`.

**Regras de negócio (400/404/409)**
- `effectiveTo > effectiveFrom`; `effectiveUntil > effectiveFrom`; revisão dentro da vigência do contrato (se o contrato tem `effectiveTo`, a revisão precisa de `effectiveUntil ≤ effectiveTo`).
- `maximumCapacity ≥ reservedCapacity`; `maximumQuota ≥ minimumQuota`.
- `internalCode` e `contractNumber` únicos → 409 `Contract identity already exists`.
- Edição só em `DRAFT` → 400 `Only DRAFT contracts can be edited`.
- Owner/base/produto/pool inexistentes → 404; inativos ou sem vínculo → 400 (ver seção 1).
- Fora do seu escopo: criação → 403; edição/detalhe/ações → 404.

### 2.3 Ações de status — `POST /contracts/:id/{ação}`

Body (`.strict()`):
```json
{ "justification": "texto obrigatório", "stockDeclaration": "ZERO" }
```
- `justification`: **obrigatória** em todas as transições (400 `justification is required`), exceto `submit` (opcional).
- `stockDeclaration` (`ZERO` | `PREEXISTING_STOCK`): relevante só no `approve`. **Obrigatório quando a base já passou por cutover** (saldo inicial ativo); caso contrário 400. Se faltar declaração de abertura para algum item → 409 `Opening declaration missing for contract item <id>`.
- `close` → 409 `Contract has non-zero custody exposure` se houver saldo/posição diferente de zero.

### 2.4 Máquina de estados

```
DRAFT → PENDING_APPROVAL | CANCELLED
PENDING_APPROVAL → ACTIVE | CANCELLED
ACTIVE → SUSPENDED | CLOSING | EXPIRED(auto)
SUSPENDED → ACTIVE | CLOSING | EXPIRED(auto) | CANCELLED
CLOSING → CLOSED
CLOSED / CANCELLED / EXPIRED: terminais
```
Transição inválida → 400 `Invalid contract transition: X -> Y`. **ACTIVE não pode ser cancelado direto** (precisa CLOSING → CLOSED). `EXPIRED` é aplicado por job automático quando `effectiveTo` vence.

Botões por status (sugestão):
| Status | Ações |
|---|---|
| DRAFT | Editar, Enviar p/ aprovação, Cancelar |
| PENDING_APPROVAL | Aprovar, Cancelar |
| ACTIVE | Suspender, Iniciar encerramento, Nova revisão |
| SUSPENDED | Reativar, Iniciar encerramento, Cancelar, Nova revisão |
| CLOSING | Encerrar |
| demais | somente leitura |

### 2.5 Nova revisão — `POST /contracts/:id/revisions`

Só em contrato `ACTIVE`/`SUSPENDED` com revisão corrente aprovada. Body = `revision` acima, **com `justification` obrigatória**:
```json
{ "effectiveFrom": "2026-07-01T00:00:00.000Z", "effectiveUntil": null, "justification": "Reajuste de cota", "items": [ /* itens completos */ ] }
```
- `effectiveFrom` deve ser **posterior a todas as revisões existentes** (400).
- Já nasce aprovada (`revisionNumber` = último + 1). Não troca a revisão corrente na hora; ela passa a valer na data pelo job de ciclo de vida (aparece em `revisions[]`).
- Remover item que tem saldo/exposição ≠ 0 → 409 `Contract item has non-zero custody exposure`.
- Enviar a lista **completa** de itens da nova revisão.

## 3. Resposta (`GET /contracts/:id`)

```json
{
  "id": "uuid", "internalCode": "CT-2026-001", "contractNumber": "4600001234",
  "ownerId": "uuid",
  "owner": { "id": "uuid", "internalCode": "...", "cnpj": "...", "legalName": "...", "tradeName": "...", "status": "ACTIVE" },
  "source": "...", "baseCode": "SSA", "status": "ACTIVE",
  "effectiveFrom": "ISO", "effectiveTo": "ISO",
  "currentRevisionId": "uuid",
  "currentRevision": { "...": "mesma forma de revisions[]" },
  "revisions": [
    { "id": "uuid", "revisionNumber": 1, "effectiveFrom": "ISO", "effectiveUntil": "ISO", "approvedAt": "ISO", "justification": "...", "items": [ { "id": "uuid", "productId": "uuid", "productCode": "...", "poolId": "uuid", "accountingMeasure": "GSV", "reservedCapacity": "1000.000", "...": "..." } ] }
  ],
  "createdAt": "ISO", "updatedAt": "ISO"
}
```
- Campos nulos são **omitidos** (não vêm `null`): trate `undefined` para `effectiveTo`, `currentRevision`, `minimumQuota` etc.
- Decimais chegam como **string**.
- Revisão sem `approvedAt` = rascunho em edição.

## 4. Erros

| Status | Significado |
|---|---|
| 400 | Validação, regra de negócio, transição inválida, justificativa ausente, parâmetro de query desconhecido |
| 401 | Sem token |
| 403 | Sem permissão RBAC (`User '<id>' does not have required permissions: ...`) ou criação fora do escopo |
| 404 | Contrato/owner/produto/pool/base inexistente, ou contrato fora do escopo |
| 409 | Identidade duplicada, declaração de abertura ausente, exposição de custódia ≠ 0 |

## 5. Efeitos para outros módulos
- Aprovação, mudanças de status, criação de revisão, alterações em Owner/OwnerProduct/Produto/Pool **republicam** o evento `custody.contract.updated` (consumido por outros sistemas). O front não precisa fazer nada, mas alterações em produto/owner afetam contratos ativos.
- Edição de `OwnerProduct` (rótulos) não altera itens de contrato já gravados.

## 6. Checklist do front
- [ ] Enviar quantidades/percentuais como string e datas em ISO UTC.
- [ ] PATCH do rascunho e nova revisão: reenviar **todos** os itens.
- [ ] Filtrar seletor de produtos pelos produtos do Owner e de pools pela base/produto.
- [ ] Exigir justificativa nos modais de ação; exigir `stockDeclaration` no approve (quando aplicável).
- [ ] Habilitar botões conforme status e permissões (tratar 403).
- [ ] Tratar `rows: []` como "sem acesso/sem dados" na listagem.
- [ ] Aceitar 201 nas ações POST.
