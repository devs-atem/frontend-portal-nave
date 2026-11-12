# Integração Front — Tela de Clientes

> Base URL: `/rest` (ex.: `/rest/clients`). Todas as rotas exigem `Authorization: Bearer <JWT Cognito>` (sem token → 401).
> Swagger: `/api/docs`.

## 1. Modelo de dados

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `id` | uuid | gerado | |
| `name` | string | sim | min 1 |
| `bp` | string | sim | **único** (código BP/SAP) |
| `cnpj.headquarters` | string | sim | CNPJ da matriz, **único**, validado (dígitos verificadores) |
| `cnpj.branches` | string[] | não | CNPJs das filiais, cada um validado |
| `isActive` | boolean | não | default `true` |
| `products` | Product[] | só na resposta | produtos vinculados |
| `contracts` | objetos | só se `contractFields` enviado | ver seção 4 |
| `createdAt` / `updatedAt` | ISO-8601 | resposta | |

Notas:
- Aceita CNPJ com ou sem máscara e CNPJ alfanumérico. **O valor é salvo exatamente como enviado** (sem normalizar). Para evitar duplicidade "mascarado × não mascarado", **padronize no front** (recomendado: enviar sempre só os caracteres, sem `. - /`).
- Filiais não têm unicidade nem checagem contra a matriz.
- Não existem no cliente: grupo, cliente pai, endereço, contatos. (Endereço/contatos existem só no **Owner**, ver `contratos.md`.)

## 2. Endpoints

| Método | URL | Descrição |
|---|---|---|
| `POST` | `/rest/clients` | Cria cliente (201) |
| `GET` | `/rest/clients?page&limit&contractFields` | Lista paginada |
| `GET` | `/rest/clients/all` | Lista completa sem paginação (sem `products`) |
| `GET` | `/rest/clients/:id?contractFields` | Detalhe (com `products`) |
| `PATCH` | `/rest/clients/:id` | Atualização parcial |
| `DELETE` | `/rest/clients/:id` | Exclusão (200 `{ "success": true }`) |

### 2.1 Criar — `POST /rest/clients`

```json
{
  "name": "Cliente Exemplo S.A.",
  "bp": "1000234",
  "cnpj": {
    "headquarters": "<CNPJ válido da matriz>",
    "branches": ["<CNPJ válido filial 1>", "<CNPJ válido filial 2>"]
  },
  "isActive": true
}
```

Não envie `productIds` na criação: **vínculo com produtos é feito via PATCH** (2.4).

### 2.2 Listar — `GET /rest/clients?page=1&limit=10`

- `page` default 1; `limit` default 10, máx 100 (valores fora da faixa são ajustados, não geram erro).
- Sem filtros e sem ordenação customizável.
- Resposta: `{ "rows": [Client], "total": 120 }`. Linhas **não** trazem `products`.

### 2.3 Detalhe — `GET /rest/clients/:id`

Retorna `products` completos. `id` inexistente → 404 `Client "<id>" not found`.

```json
{
  "id": "uuid",
  "name": "Cliente Exemplo S.A.",
  "bp": "1000234",
  "cnpj": { "headquarters": "...", "branches": ["..."] },
  "isActive": true,
  "products": [
    { "id": "uuid", "sapCode": "000000000012345", "name": "Diesel S10", "createdAt": "ISO", "updatedAt": "ISO" }
  ],
  "createdAt": "ISO",
  "updatedAt": "ISO"
}
```

### 2.4 Atualizar — `PATCH /rest/clients/:id`

Todos os campos são opcionais. **Atenção às regras de substituição total:**

```json
{
  "name": "Novo nome",
  "bp": "1000235",
  "cnpj": { "headquarters": "...", "branches": ["..."] },
  "isActive": false,
  "productIds": ["uuid-prod-1", "uuid-prod-2"]
}
```

| Campo | Se ausente | Se enviado |
|---|---|---|
| `cnpj.branches` | não altera | **substitui todas** as filiais; `[]` remove todas |
| `productIds` | não altera | **substitui todo o conjunto** de produtos; `[]` desvincula todos |

Portanto, para adicionar 1 produto, o front deve enviar a lista **completa** (existentes + novo). Não há endpoint incremental. `productIds` repetidos → 409. Tudo roda em transação.

### 2.5 Excluir — `DELETE /rest/clients/:id`

Hard delete. Remove em cascata filiais e vínculos com produtos (produtos em si permanecem). **Não verifica contratos** (não há FK entre cliente e contrato). Recomenda-se confirmação no front.

## 3. Erros

| Status | Quando |
|---|---|
| 400 | Zod/validação, `CNPJ inválido` |
| 401 | Sem/ inválido token |
| 404 | Cliente ou produto (em `productIds`) inexistente |
| 409 | `Já existe um cliente cadastrado com o BP "<bp>"` / `... com o CNPJ da matriz "<cnpj>"` / `productIds` repetido |

Formato: `{ "statusCode": 409, "message": "...", "error": "Conflict" }`. As mensagens de 409 já estão em PT e podem ser exibidas direto.

## 4. Relações

### Cliente ↔ Produto (N:N)
- Gerenciado por `productIds` no `PATCH /clients/:id` **ou** `clientIds` no `PATCH /products/:id` (ambos substituição total).
- O vínculo cliente↔produto aqui é **cadastral/catálogo**. Ele **não** é o que habilita o produto em um contrato (isso é `OwnerProduct`, ver `contratos.md`).

### Cliente → Contratos (vínculo lógico por CNPJ)
- **Não existe FK** entre `Client` e `Contract`. O contrato aponta para um **Owner** (depositante) e o vínculo é: `owner.cnpj` ∈ {CNPJ da matriz + CNPJs das filiais} do cliente (comparação normalizada, ignora máscara).
- Para exibir contratos na tela do cliente, use `contractFields` (lista separada por vírgula de campos do contrato) em `GET /clients` ou `GET /clients/:id`:

```
GET /rest/clients/{id}?contractFields=id,contractNumber,status,effectiveFrom,effectiveTo
```

Resposta acrescenta:

```json
"contracts": [
  { "id": "uuid", "contractNumber": "4600001234", "status": "ACTIVE", "effectiveFrom": "ISO", "effectiveTo": "ISO" }
]
```

- Campos aceitos: `id, internalCode, contractNumber, ownerId, source, baseCode, status, effectiveFrom, effectiveTo, createdBy, currentRevisionId, createdAt, updatedAt`.
- Campos inválidos são **ignorados em silêncio**; se nenhum for válido, `contracts` não vem na resposta.
- Ordenação: `createdAt asc`. Cliente sem contratos → `contracts: []`.
- Esta rota **não** aplica o escopo de permissão de custódia; para a listagem oficial de contratos use `GET /rest/contracts` (ver `contratos.md`).

## 5. Checklist do front
- [ ] Padronizar CNPJ (sem máscara) antes de enviar; exibir máscara só na UI.
- [ ] Validar CNPJ no cliente (UX), mas tratar 400 do back.
- [ ] No PATCH de filiais/produtos, sempre enviar a lista completa.
- [ ] Tratar 409 de BP/CNPJ duplicado no formulário.
- [ ] `isActive=false` apenas altera a flag (não há efeito colateral conhecido em contratos).
