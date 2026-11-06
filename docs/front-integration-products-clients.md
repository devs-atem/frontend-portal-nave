# Integração do Front com as APIs de Produtos e Clientes

Guia para o time de front-end consumir as APIs de **Produtos** (`/products`) e **Clientes** (`/clients`) do `mw-nave`, e o **contrato OpenAPI** (pacote npm) que tiapifica essas chamadas.

> Fonte da verdade: controllers e DTOs em `src/modules/product` e `src/modules/client`. Em caso de divergência, vale o código (e o contrato gerado a partir dele).

---

## 1. Convenções gerais

### 1.1 Base URL e prefixo

Todas as rotas ficam sob o prefixo global **`/rest`**:

```
{API_BASE_URL}/rest/products
{API_BASE_URL}/rest/clients
```

Em desenvolvimento a porta padrão é `3000` (`PORT`), ou seja, `http://localhost:3000/rest/...`. CORS está habilitado.

### 1.2 Autenticação

- Todas as rotas de produtos e clientes exigem **JWT do AWS Cognito** no header:

```
Authorization: Bearer <access_token>
```

- Algoritmo RS256, validado contra o JWKS do User Pool do Cognito.
- Sem header, token inválido/expirado ou chave desconhecida → **401 Unauthorized**.
- Os controllers de produtos/clientes **não aplicam RBAC por rota** hoje: qualquer usuário autenticado acessa todos os endpoints (inclusive `DELETE`). Se o front precisar esconder ações por perfil, isso deve ser tratado no front por enquanto e alinhado com o back.

### 1.3 Content-Type

`Content-Type: application/json` em `POST` e `PATCH`.

### 1.4 Identificadores e datas

- `id`: UUID (string).
- `createdAt` / `updatedAt`: string ISO-8601 (ex.: `2026-11-06T13:45:00.000Z`).

### 1.5 Paginação

Endpoints paginados (`GET /products`, `GET /clients`) recebem query params:

| Param   | Tipo   | Default | Observação                       |
| ------- | ------ | ------- | -------------------------------- |
| `page`  | number | `1`     | Base 1. Valores < 1 viram `1`.   |
| `limit` | number | `10`    | Mínimo `1`, máximo **`100`**.    |

Resposta:

```json
{
  "rows": [ /* itens */ ],
  "total": 42
}
```

`total` é a contagem total de registros (não da página). Total de páginas = `Math.ceil(total / limit)`. Não há filtros nem ordenação configurável (a ordem não é garantida pela API).

### 1.6 Formato de erros

Erros seguem o padrão NestJS:

```json
{ "statusCode": 404, "message": "Client \"<id>\" not found", "error": "Not Found" }
```

| Status | Quando                                                                                          |
| ------ | ----------------------------------------------------------------------------------------------- |
| 400    | Body/params inválidos (validação Zod: campo ausente, CNPJ inválido, id que não é UUID em arrays) |
| 401    | Token ausente, inválido ou expirado                                                             |
| 404    | Recurso (ou algum item de `productIds`/`clientIds`) não existe                                  |
| 409    | Conflito de unicidade ou ids duplicados na lista de vínculos                                    |
| 500    | Erro inesperado                                                                                 |

Exiba `message` ao usuário apenas quando fizer sentido; em 400 trate como erro de formulário.

---

## 2. API de Produtos — `/rest/products`

### 2.1 Modelo

**Produto (`ProductResponse`)**

```ts
type Product = {
  id: string;          // uuid
  sapCode: string;     // único
  name: string;
  clients?: LinkedClient[]; // somente em GET /products/:id, POST e PATCH
  createdAt: string;
  updatedAt: string;
};

type LinkedClient = {
  id: string;
  name: string;
  bp: string;
  cnpj: { headquarters: string; branches: string[] };
  isActive: boolean;
  createdAt: string;
  // NÃO traz `products` (evita recursão)
};
```

> Atenção: `clients` **não vem** nas listagens (`GET /products` e `GET /products/all`). Para ver os clientes vinculados, use `GET /products/:id`.

### 2.2 Endpoints

| Método | Rota                | Descrição                                   | Resposta            |
| ------ | ------------------- | ------------------------------------------- | ------------------- |
| POST   | `/products`         | Cria produto                                | `201` Product (`clients: []`) |
| GET    | `/products`         | Lista paginada                              | `200` `{ rows, total }` |
| GET    | `/products/all`     | Lista completa, sem paginação               | `200` `Product[]`   |
| GET    | `/products/:id`     | Detalhe, com clientes vinculados            | `200` Product       |
| PATCH  | `/products/:id`     | Atualiza campos e/ou substitui vínculos     | `200` Product (com `clients`) |
| DELETE | `/products/:id`     | Remove produto (e seus vínculos)            | `200` `{ "success": true }` |

### 2.3 Criar — `POST /rest/products`

```json
{ "name": "Soja Premium", "sapCode": "SAP-0001" }
```

| Campo     | Regras                |
| --------- | --------------------- |
| `name`    | string, mínimo 1 char |
| `sapCode` | string, mínimo 1 char, **único** |

Erros: `400` (campo faltando/vazio), `409` (`sapCode` já existe).

### 2.4 Atualizar — `PATCH /rest/products/:id`

Todos os campos são opcionais:

```json
{
  "name": "Novo nome",
  "sapCode": "SAP-0002",
  "clientIds": ["<uuid>", "<uuid>"]
}
```

Regra importante de **`clientIds` (substituição total)**:

| Valor enviado       | Efeito                                         |
| ------------------- | ---------------------------------------------- |
| omitido             | vínculos **não são alterados**                 |
| `[]`                | **remove todos** os vínculos                   |
| `["a", "b"]`        | vínculos passam a ser **exatamente** `a` e `b` |

Ou seja: para adicionar um cliente, o front deve enviar a lista **completa** (existentes + novo). A operação é transacional.

Erros: `404` (produto ou algum cliente da lista não existe — a mensagem lista os ids faltantes), `409` (ids duplicados em `clientIds`, ou `sapCode` já em uso), `400` (ids não-UUID).

### 2.5 Remover — `DELETE /rest/products/:id`

Retorna `{ "success": true }`. `404` se não existir.

---

## 3. API de Clientes — `/rest/clients`

### 3.1 Modelo

**Cliente (`ClientResponse`)**

```ts
type Client = {
  id: string;
  name: string;
  bp: string;                                  // Business Partner
  cnpj: {
    headquarters: string;                      // matriz (único)
    branches: string[];                        // filiais
  };
  isActive: boolean;
  products?: LinkedProduct[];                  // somente em GET /clients/:id e PATCH
  createdAt: string;
  updatedAt: string;
};

type LinkedProduct = {
  id: string;
  sapCode: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  // NÃO traz `clients` (evita recursão)
};
```

> Atenção: `products` **não vem** em `POST`, `GET /clients` e `GET /clients/all`. Para ver os produtos vinculados use `GET /clients/:id`.

### 3.2 Endpoints

| Método | Rota                | Descrição                                   | Resposta            |
| ------ | ------------------- | ------------------------------------------- | ------------------- |
| POST   | `/clients`          | Cria cliente                                | `201` Client        |
| GET    | `/clients`          | Lista paginada                              | `200` `{ rows, total }` |
| GET    | `/clients/all`      | Lista completa, sem paginação               | `200` `Client[]`    |
| GET    | `/clients/:id`      | Detalhe, com produtos vinculados            | `200` Client        |
| PATCH  | `/clients/:id`      | Atualiza campos e/ou substitui vínculos     | `200` Client (com `products`) |
| DELETE | `/clients/:id`      | Remove cliente (filiais e vínculos em cascata) | `200` `{ "success": true }` |

### 3.3 Criar — `POST /rest/clients`

```json
{
  "name": "Fazenda Boa Vista",
  "bp": "1000234",
  "cnpj": {
    "headquarters": "11222333000181",
    "branches": ["44555666000199"]
  },
  "isActive": true
}
```

| Campo                  | Obrigatório | Regras                                                     |
| ---------------------- | ----------- | ---------------------------------------------------------- |
| `name`                 | sim         | string, mínimo 1                                           |
| `bp`                   | sim         | string, mínimo 1                                           |
| `cnpj.headquarters`    | sim         | mínimo 14 chars e **CNPJ válido** (dígito verificador)     |
| `cnpj.branches`        | não         | array de CNPJs válidos (default: `[]`)                     |
| `isActive`             | não         | boolean (default: `true`)                                  |

Erros: `400` (`"CNPJ inválido"` ou campo faltando), `409` (já existe cliente com esse CNPJ matriz).

### 3.4 Atualizar — `PATCH /rest/clients/:id`

Todos os campos são opcionais:

```json
{
  "name": "Novo nome",
  "bp": "1000999",
  "cnpj": { "headquarters": "11222333000181", "branches": [] },
  "isActive": false,
  "productIds": ["<uuid>"]
}
```

Regras de substituição:

- **`productIds`**: mesma semântica de `clientIds` em produtos — omitido = não mexe; `[]` = remove todos; lista = substitui integralmente.
- **`cnpj.branches`**: se enviado, **substitui todas as filiais** (enviar `[]` apaga todas). Se omitido, as filiais permanecem. Para adicionar uma filial, envie a lista completa.
- `cnpj.headquarters` é opcional dentro de `cnpj`; só é alterado se enviado.

Erros: `404` (cliente ou algum produto da lista não existe), `409` (ids duplicados em `productIds` ou CNPJ matriz já em uso), `400` (CNPJ inválido, ids não-UUID).

### 3.5 Remover — `DELETE /rest/clients/:id`

Retorna `{ "success": true }`. Remove também filiais e vínculos com produtos. `404` se não existir.

---

## 4. Relação Produto ↔ Cliente (N:N)

- Um produto pode ter vários clientes e um cliente vários produtos.
- **Não existe endpoint dedicado de vínculo.** O vínculo é editado pelos dois lados via `PATCH`:
  - `PATCH /products/:id` com `clientIds`
  - `PATCH /clients/:id` com `productIds`
- Ambos fazem substituição total (ver 2.4 e 3.4). Recomenda-se, no front, carregar o detalhe (`GET /:id`), editar a lista local e enviar a lista final.
- Os dois lados são equivalentes: vincular pelo cliente reflete no produto e vice-versa.
- Para popular selects/multiselects de vínculo, use `GET /products/all` e `GET /clients/all`.

Fluxo típico de tela de vínculo (cliente → produtos):

1. `GET /clients/:id` → obtém `products` atuais.
2. `GET /products/all` → opções disponíveis.
3. Usuário altera a seleção.
4. `PATCH /clients/:id` com `{ "productIds": [ ...todos os ids selecionados ] }`.
5. Use a resposta (já traz `products` atualizados) para atualizar o estado/cache.

---

## 5. Boas práticas para o front

- **CNPJ**: a validação aceita pontuação (`11.222.333/0001-81`), mas o valor é **salvo exatamente como enviado** e a unicidade da matriz compara a string. Padronize: envie **apenas dígitos/caracteres alfanuméricos, sem máscara** e aplique a máscara só na exibição. O validador já suporta o CNPJ alfanumérico (vigente a partir de jul/2026).
- Valide o CNPJ também no front (mesmo algoritmo) para feedback imediato; o back continua sendo a fonte final.
- Trate `409` com mensagem amigável (ex.: "Já existe um cliente com este CNPJ" / "SAP code já cadastrado").
- Após `POST/PATCH/DELETE`, invalide as queries de lista e detalhe **dos dois recursos** (um vínculo altera produto e cliente).
- `DELETE` é definitivo (sem soft delete). Peça confirmação ao usuário. Para desativar um cliente sem apagar, use `PATCH` com `isActive: false`.
- Não dependa da ordem das listagens; ordene no front se necessário.
- Use `limit` ≤ 100.

---

## 6. Contrato OpenAPI (pacote `@devs-atem/mw-nave-contract`)

O repositório gera automaticamente um **contrato OpenAPI** a partir dos controllers/DTOs e o publica como pacote npm, já com tipos TypeScript e hooks React Query (gerados com [orval](https://orval.dev)).

> Observação: não existe, hoje, um módulo/API de "contratos" de negócio (ex.: contratos comerciais). Esta seção trata do **contrato de API** (OpenAPI).

### 6.1 O que é gerado

| Artefato                       | Conteúdo                                              |
| ------------------------------ | ----------------------------------------------------- |
| `contract/contract.json/.yaml` | Especificação OpenAPI                                 |
| `contract/contract.d.ts`       | Tipos `paths`, `components`, `operations` (openapi-typescript) |
| `contract/client/client.ts`    | Funções de chamada + hooks React Query (orval)        |
| `contract/client/types`        | Tipos dos schemas (DTOs de request/response)          |
| `contract/index.d.ts`          | Entrypoint: exporta `paths`, `components`, `operations`, `Client`, `Types` |

Os arquivos gerados não são versionados no git (somente `contract/package.json`); eles são produzidos por `yarn generate-contract` e publicados no pacote.

### 6.2 Instalação no front

```bash
yarn add @devs-atem/mw-nave-contract @tanstack/react-query
```

`@tanstack/react-query >= 5` é *peer dependency*. Os canais de publicação são `alpha`, `beta` e `release` (dist-tags do npm), por exemplo:

```bash
yarn add @devs-atem/mw-nave-contract@alpha
```

A versão atual do pacote no repositório é `1.0.0-alpha.3`. Confirme no registry a versão/canal disponível.

### 6.3 Uso

```ts
import type { paths, components } from '@devs-atem/mw-nave-contract';
import { Client, Types } from '@devs-atem/mw-nave-contract';

// Tipos
type CreateClientBody = Types.CreateClientDto;
type ClientResponse = Types.ClientResponseDto;
```

Os nomes exatos das funções/hooks em `Client` são gerados pelo orval a partir dos `operationId` do Nest (padrão `ClientController_create`, `ProductController_findOne`, etc.). Consulte o `index.d.ts` do pacote instalado para ver os nomes disponíveis.

Configure a base URL e o token no cliente HTTP (mutator/axios/fetch) para incluir `/rest` e o header `Authorization: Bearer <token>`.

### 6.4 Documentação interativa (Swagger)

Disponível em `{API_BASE_URL}/api/docs` (protegida por Basic Auth). Esquema de segurança: Bearer JWT (`Authorization`).

### 6.5 Fluxo para o time de back (referência)

```bash
yarn generate-contract   # gera contract.json/yaml/d.ts + client (orval)
yarn publish-alpha       # gera e publica prerelease (-alpha.N)
yarn publish-beta        # gera e publica prerelease (-beta.N)
yarn publish-release     # gera e publica a versão base
```

Sempre que um DTO/controller mudar, o contrato deve ser regenerado e republicado; o front deve atualizar o pacote para receber os novos tipos.

---

## 7. Resumo rápido de rotas

| Recurso  | Criar         | Listar pág.       | Listar tudo        | Detalhe             | Atualizar            | Remover              |
| -------- | ------------- | ----------------- | ------------------ | ------------------- | -------------------- | -------------------- |
| Produtos | `POST /rest/products` | `GET /rest/products?page&limit` | `GET /rest/products/all` | `GET /rest/products/:id` | `PATCH /rest/products/:id` | `DELETE /rest/products/:id` |
| Clientes | `POST /rest/clients`  | `GET /rest/clients?page&limit`  | `GET /rest/clients/all`  | `GET /rest/clients/:id`  | `PATCH /rest/clients/:id`  | `DELETE /rest/clients/:id`  |
