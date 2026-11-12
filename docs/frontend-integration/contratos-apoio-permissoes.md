# Contratos — Bases, Pools, Produtos do depositante e Permissões

Complemento do `contratos.md`. Base URL: `/rest`. Fonte: `src/modules/operational-catalog`, `src/modules/pool`, `src/shared/constants/rbac.ts`.

## 1. Bases e Pools (seletores do formulário)

Todos paginados: `{ "rows": [...], "total": N }`; `page` ≥ 1 (default 1), `limit` 1..100 (default 10, fora da faixa = 400). Query estrita (parâmetro desconhecido = 400).

### 1.1 Bases — `GET /rest/operational-catalog/bases`
Permissão: `app:custody:operational-catalog:read`.
Filtros: `source`, `baseCode`, `status` (`ACTIVE`|`INACTIVE`).

```json
{ "id": "uuid", "source": "...", "baseCode": "SSA", "name": "Base Salvador",
  "status": "ACTIVE", "timezone": "America/Bahia",
  "sourceVersion": 3, "sourceUpdatedAt": "ISO", "synchronizedAt": "ISO" }
```
Use `?status=ACTIVE`. **O par `source` + `baseCode` é a chave da base** e ambos vão no body do contrato.

### 1.2 Produtos operacionais da base — `GET /rest/operational-catalog/products`
Mesma permissão. Filtros: `source`, `baseCode`, `productCode`, `status`.
Campos: `id, source, baseCode, productCode, sourceProductId, name, status, ...`.
O contrato exige que o produto esteja **ACTIVE na base** (`productCode` = `sapCode`).

### 1.3 Tanques da base — `GET /rest/operational-catalog/tanks`
Mesma permissão. Filtros: `source`, `baseCode`, `tankCode`, `productCode`, `status` (`ACTIVE|INACTIVE|BLOCKED`).
Campos: `tankCode, productCode, physicalCapacityLiters, operationalCapacityLiters, status, ...` (decimais como string).
Alimenta o seletor de `allowedTankCodes` do item (filtrar por `baseCode` + `productCode`).

### 1.4 Pools — `GET /rest/pools`
Permissão: `app:custody:pool:read`.
Filtros: `source`, `baseCode`, `code`, `status` (`ACTIVE|INACTIVE`), `productCode`.

```json
{ "id": "uuid", "source": "...", "baseCode": "SSA", "code": "POOL-A", "name": "Pool A",
  "status": "ACTIVE", "effectiveFrom": "ISO", "effectiveTo": null,
  "allowedProducts": [ { "productCode": "000000000012345", "name": "Diesel S10", "status": "ACTIVE" } ],
  "createdAt": "ISO", "updatedAt": "ISO" }
```
Carregar com `?source=..&baseCode=..&status=ACTIVE&productCode=<sapCode do item>` → já devolve só pools da base que **permitem o produto**. O valor que vai no item é `poolId` = `id` do pool.
Também validado no back: vigência do pool cobre a revisão (`effectiveFrom ≤ revisão.effectiveFrom`; se pool tem `effectiveTo`, a revisão precisa terminar antes dele). O front pode exibir `effectiveFrom/effectiveTo` e alertar.
`GET /rest/pools/:id` retorna o mesmo objeto.

### 1.5 Códigos de tipo de movimento (`allowedMovementTypeCodes`)
**Não há endpoint de catálogo de tipos de movimento.** O campo é lista livre de strings (mín. 1 item) validada apenas por formato; o valor é comparado com o `movementTypeCode` que vem do supervisório. **Pendência com o back/negócio:** definir a lista oficial de códigos para o front montar um multiselect (até lá, usar lista fixa configurada no front).

## 2. Produtos do depositante (Owner) e filtro por cliente

### 2.1 Produtos do Owner — `GET /rest/owners/:ownerId/products?page&limit`
Permissão do Owner: `app:custody:owner:read`. Cada registro é um `OwnerProduct` com `productId`, `customerProductCode`, `customerProductDescription` (usar para pré-preencher o item do contrato). Só estes produtos podem entrar no contrato (senão 400 `is not linked to the Owner`).

Cadastro: `POST /rest/owners/:ownerId/products` (`app:custody:owner:write`), body `{ "productId", "customerProductCode?", "customerProductDescription?" }` — ao menos um rótulo.

### 2.2 Filtro "por cliente" na listagem de contratos
`GET /rest/contracts` só filtra por `ownerId` (igualdade exata); **não há filtro por `clientId`**. Opções:
1. Na tela de contratos, o seletor é de **Owner** (`GET /rest/owners?status=ACTIVE`), e o filtro envia `ownerId`.
2. Para "filtrar por cliente": buscar o cliente (`GET /rest/clients/:id`), pegar CNPJ matriz + filiais, localizar os Owners com `GET /rest/owners?cnpj=<cnpj>` (um por CNPJ) e consultar contratos por `ownerId`. Ou, mais simples, usar `GET /rest/clients/:id?contractFields=id,contractNumber,status,...` (traz os contratos do cliente por CNPJ, mas **sem paginação e sem escopo de custódia**).
> Pendência: confirmar com o back se vale criar `clientId`/`ownerCnpj` como filtro em `/contracts`. O filtro `cnpj` de `/owners` é igualdade exata (CNPJ canônico, sem máscara) — **não validado por execução**.

## 3. Permissões

### 3.1 O que o back valida
O back valida **somente** chaves `app:custody:*` (em `SYSTEM_MODULES` do RBAC externo, via `RBACGuard`, por usuário). **Não existe no repositório do back nenhuma referência a `portal_nave:*` nem a `nave_cliente`** — essas chaves são do front/portal e precisam de um mapeamento no front ou no cadastro do RBAC. Resultado: falta de permissão = 403; contrato fora do escopo = 404.

Mapeamento sugerido front → back (o front deve decidir a visibilidade com a mesma chave que o back vai exigir):

| Ação na UI | Rota | Chave que o back exige |
|---|---|---|
| Ver menu/lista/detalhe | `GET /contracts`, `/contracts/:id` | `app:custody:contract:read` |
| Criar/editar rascunho, enviar p/ aprovação, nova revisão | `POST/PATCH /contracts`, `/submit`, `/revisions` | `app:custody:contract:write` |
| **Aprovar** | `POST /contracts/:id/approve` | `app:custody:contract:approve` |
| **Suspender, reativar, iniciar encerramento, encerrar, cancelar** | `/suspend` `/reactivate` `/start-closing` `/close` `/cancel` | `app:custody:contract:status` |
| Seletor de bases/produtos/tanques | `/operational-catalog/*` | `app:custody:operational-catalog:read` |
| Seletor de pools | `GET /pools` | `app:custody:pool:read` |
| Seletor de Owner e produtos do Owner | `GET /owners`, `/owners/:id/products` | `app:custody:owner:read` |

**Resposta à pergunta do gestor:** sim, o back tem **chaves separadas** para aprovar (`contract:approve`) e para mudar status (`contract:status`), além de `read` e `write`. A decisão de quem recebe cada uma está no seed de papéis (3.2).

### 3.2 Papéis padrão (seed `scripts/seed-custody-rbac.ts`, tabela `group_rbac`)

| Papel | contract:read | contract:write | contract:approve | contract:status | Observações |
|---|---|---|---|---|---|
| `administrador-custodia` | ✔ | ✔ | ✔ | ✔ | todas as chaves + `scope:all` |
| `gestor-custodia` | ✔ | ✘ | ✘ | ✘ | só leitura nos contratos (+ saldo inicial, exceções, ocorrências) |
| `operador-custodia` | ✔ | ✘ | ✘ | ✘ | lê catálogo operacional e contratos |
| `supervisor-custodia` | ✔ | ✘ | ✘ | ✘ | leitura + exceções/ocorrências |
| `auditor-custodia` | ✔ | ✘ | ✘ | ✘ | leitura; **não** lê catálogo operacional, owners nem pools |

**Atenção:** no seed atual **só o administrador** tem `write`, `approve` e `status` de contrato; o **gestor não aprova nem muda status**. Se o gestor deve aprovar/mudar status, é preciso alterar `CUSTODY_ROLE_PERMISSIONS` em `src/shared/constants/rbac.ts` e reaplicar o seed (decisão de negócio — pendência).
Também note: `operador` e `auditor` leem contratos mas **não têm** `owner:read`/`pool:read` (auditor nem `operational-catalog:read`); a tela de detalhe funciona (owner vem embutido no contrato), mas os seletores de criação só funcionam para quem tem escrita (admin).

### 3.3 Escopo de dados (além da chave)
Mesmo com `contract:read`, o usuário só enxerga contratos das suas **bases** (`CENTERS`) e **CNPJs** (`CNPJ`) no RBAC. Sem esses artefatos e sem `app:custody:scope:all`, a listagem vem vazia (`rows: []`). O seed cria os papéis com `CENTERS: []`, ou seja, **os escopos por usuário precisam ser atribuídos separadamente**.

### 3.4 Como o front descobre as permissões do usuário
Não achei endpoint do back que devolva as permissões `app:custody:*` do usuário logado. Opções: (a) o portal já recebe o RBAC por outro serviço (verificar o que alimenta `portal_nave:*`); (b) pedir ao back um endpoint tipo `GET /me/permissions`; (c) esconder botões por papel e tratar o 403. **Pendência com o back.**

## 4. Restrição de cliente (`nave_cliente`)
Para o cliente não acessar contratos, basta o RBAC **não conceder** nenhuma `app:custody:contract:*` ao grupo dele: o back responde 403 nas rotas e a lista nunca é exposta. O front deve ocultar o menu com a mesma regra. Não há papel `nave_cliente` definido no back.

## 5. Pendências a fechar com o back / negócio
1. Lista oficial de códigos de tipo de movimento.
2. Filtro de contratos por cliente/CNPJ (hoje só `ownerId`).
3. Endpoint de permissões do usuário logado (ou origem do `portal_nave:*`).
4. Gestor deve ter `contract:write/approve/status`? (hoje não tem.)
5. Delete de produto em uso retorna 500 (ver `produtos.md`).
