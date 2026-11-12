# Documento de Requisitos

## Introdução

Esta feature substitui a tela mock de **Contratos** (`/contratos`) do `frontend-portal-nave` por uma integração real com a API de contratos de custódia do `mw-nave`, conforme `docs/frontend-integration/contratos.md`. É a **terceira de três specs** (Clientes → Produtos → Contratos) e reutiliza o contrato de tipos/erros definidos nas anteriores.

### Estado atual (verificado no código)

- `ContractsPage.tsx` é um formulário local com parâmetros de armazenagem (`capacidadeEstatica`, `reservaMinimaEac`, `giroMinimo`, `perdaOperacional` etc.), valores iniciais fixos e `handleSave` com `// TODO: persistir via API`. **Nenhum desses campos existe na API**, que modela contratos como Contrato → Revisões → Itens (produto + pool + cotas/capacidades).
- Rota única `/contratos`, protegida por `portal_nave:contracts:read`; edição usa `portal_nave:contracts:write`.
- O back exige permissões próprias: `app:custody:contract:read`, `:write`, `:approve` e `:status` (403 se faltar), além de **escopo de dados** por base/CNPJ.
- Não existe service de contratos, de Owners nem registro no IoC para o módulo.

### Relações (resposta à dúvida do escopo)

```
Owner (depositante) 1─N Contract 1─N ContractRevision 1─N ContractRevisionItem ─N:1─ Product
                                                                               └─N:1─ Pool
Contract N:1 OperationalBase (source + baseCode)
Owner N:N Product (OwnerProduct)  ← pré-requisito para o item de contrato
Client ··(CNPJ, lógico)·· Owner
```

- **Contrato × Cliente**: não há FK. O contrato aponta para o **Owner**; o cliente se liga ao contrato quando `owner.cnpj` ∈ {CNPJ da matriz + filiais do cliente} (normalizado).
- **Contrato × Produto**: via itens da revisão. O produto precisa estar vinculado ao **Owner** (`OwnerProduct`); o vínculo cadastral Cliente↔Produto (specs 1 e 2) **não** substitui isso. `item.productCode` deve igualar `Product.sapCode`.

### Fora de escopo

- Back-end e jobs de ciclo de vida (`EXPIRED`, vigência de revisão).
- CRUD completo de Owner e de Pools/Bases (endpoints de Pool/Base **não foram mapeados** no guia).
- Saldos, movimentações e demais módulos de custódia.

### Questões em aberto (bloqueiam partes da implementação)

1. **Endpoints de Pool e Base operacional**: como listar bases (`source` + `baseCode`) e pools (por base, vigência e produtos permitidos)? Sem isso, os seletores de base/pool não podem ser integrados.
2. **Forma de `Contract` na listagem**: `rows[]` inclui `owner`? Se não, o cliente/depositante é resolvido via `GET /owners`.
3. **Mapeamento de permissões**: o front usa `portal_nave:contracts:*`; o back valida `app:custody:contract:*`. Confirmar se o token carrega as duas famílias ou se o portal precisa de chaves novas (`approve`, `status`).
4. **Tela antiga**: os parâmetros do formulário mock não têm correspondência na API; esta spec os **remove**. Confirmar com o negócio que não há dado a migrar.

## Glossário

- **Contracts_Page**: listagem em `/contratos`.
- **Contract_Detail_Page**: detalhe em `/contratos/:id`.
- **Contract_Form**: formulário de criação/edição de rascunho (`/contratos/novo`, `/contratos/:id/editar`).
- **Contracts_Service**: serviço HTTP de contratos (`/rest/contracts`), registrado no IoC como `contracts`.
- **Owners_Service**: serviço HTTP de Owners e OwnerProducts (`/rest/owners`), registrado como `owners`.
- **Contract**: `id`, `internalCode`, `contractNumber`, `ownerId`, `source`, `baseCode`, `status`, `effectiveFrom`, `effectiveTo?`, `currentRevisionId?`.
- **Revision**: versão do contrato (`revisionNumber`, vigência, `approvedAt?`, `justification?`, `items[]`). Sem `approvedAt` = rascunho.
- **Item**: produto + pool + regras de cota/capacidade.
- **Owner**: depositante (`id`, `internalCode`, `cnpj`, `legalName`, `tradeName`, `status`).
- **OwnerProduct**: habilitação do produto para o Owner, com rótulos do cliente.
- **Status**: `DRAFT`, `PENDING_APPROVAL`, `ACTIVE`, `SUSPENDED`, `CLOSING`, `CLOSED`, `CANCELLED`, `EXPIRED`.
- **Decimal_String**: quantidade como string `^(0|[1-9]\d*)(\.\d{1,3})?$`; percentual com até 4 casas e ≤ 100.
- **Full_Replace**: PATCH de rascunho e nova revisão exigem reenvio completo (inclusive todos os itens).

## Requisitos

### Requisito 1: Listagem paginada com filtros

**História de usuário:** Como gestor de contratos, quero listar contratos com filtros, para encontrar rapidamente o que preciso.

#### Critérios de Aceitação

1. QUANDO a Contracts_Page for aberta, O Contracts_Service DEVE chamar `GET /rest/contracts?page=1&limit=10` e exibir número, código interno, depositante, base, status e vigência.
2. A Contracts_Page DEVE oferecer filtros por `status`, `baseCode`, `source`, `ownerId`, `internalCode` e `contractNumber`, todos de **igualdade exata**.
3. O Contracts_Service DEVE enviar **somente** os parâmetros permitidos (`page`, `limit`, `source`, `baseCode`, `ownerId`, `status`, `internalCode`, `contractNumber`), pois parâmetro desconhecido gera 400.
4. `limit` DEVE ficar entre 1 e 100; fora da faixa a API responde 400 (diferente de clientes), então a UI DEVE restringir os valores.
5. A ordenação DEVE ser a da API (`updatedAt desc`); a UI NÃO DEVE oferecer ordenação server-side.
6. QUANDO `rows` vier vazio e `total` for 0 sem filtros aplicados, A Contracts_Page DEVE exibir "Nenhum contrato disponível" explicando que pode se tratar de falta de dados **ou de acesso** (escopo por base/CNPJ, sem 403).
7. A paginação DEVE usar `total` e `limit` (`Math.ceil(total / limit)`).
8. ENQUANTO carrega, A Contracts_Page DEVE exibir skeleton; SE falhar, mensagem com "Tentar novamente".

### Requisito 2: Vínculo com o cliente (por CNPJ)

**História de usuário:** Como usuário, quero ver e filtrar contratos por cliente, mesmo que o contrato referencie o depositante.

#### Critérios de Aceitação

1. A Contracts_Page DEVE exibir, em cada linha, o **depositante** (Owner) e, quando houver correspondência, o **cliente** cujo CNPJ (matriz ou filial, normalizado) iguala `owner.cnpj`.
2. A Contracts_Page DEVE oferecer filtro "Cliente" alimentado por `GET /rest/clients/all`.
3. QUANDO um cliente for selecionado, A Contracts_Page DEVE resolver os Owners cujo CNPJ está no conjunto {matriz + filiais} do cliente (via `GET /rest/owners?cnpj=`) e consultar contratos por `ownerId` de cada Owner encontrado, unindo os resultados.
4. SE nenhum Owner corresponder ao cliente, ENTÃO A Contracts_Page DEVE exibir "Nenhum depositante cadastrado para o CNPJ deste cliente" em vez de lista vazia genérica.
5. A Contracts_Page DEVE aceitar `?clientId=<uuid>` na URL (deep link vindo da tela de clientes, spec 1) e aplicar o filtro automaticamente.
6. A Contracts_Page DEVE informar que o vínculo cliente↔contrato é lógico (por CNPJ) e que o escopo de custódia pode ocultar contratos.

### Requisito 3: Detalhe do contrato

**História de usuário:** Como usuário, quero ver todos os dados do contrato, suas revisões e itens.

#### Critérios de Aceitação

1. QUANDO o usuário abrir `/contratos/:id`, O Contracts_Service DEVE chamar `GET /rest/contracts/:id`.
2. A Contract_Detail_Page DEVE exibir dados gerais, Owner, status, vigência, `currentRevision` e a lista de `revisions[]` com seus itens.
3. Campos nulos omitidos pela API (`effectiveTo`, `currentRevision`, `minimumQuota` etc.) DEVEM ser tratados como `undefined`; vigência sem fim DEVE ser exibida como "Indeterminada".
4. Decimais DEVEM ser tratados como string e apenas formatados na exibição.
5. Revisão sem `approvedAt` DEVE ser rotulada "Rascunho".
6. SE a API responder 404, ENTÃO A Contract_Detail_Page DEVE exibir "Contrato não encontrado ou fora do seu escopo".

### Requisito 4: Criação de contrato (rascunho)

**História de usuário:** Como gestor, quero criar um contrato em rascunho com revisão inicial e itens.

#### Critérios de Aceitação

1. O Contract_Form DEVE seguir o fluxo: Owner (`GET /rest/owners?status=ACTIVE`) → produtos do Owner (`GET /rest/owners/:id/products`) → base (`source` + `baseCode`) → pool → itens.
2. O seletor de produtos de cada item DEVE listar **apenas** os produtos vinculados ao Owner; SE o Owner não tiver produtos, ENTÃO O Contract_Form DEVE bloquear itens e explicar que é preciso vincular produtos ao depositante.
3. Ao escolher o produto, O Contract_Form DEVE preencher `productCode` com o `sapCode` do produto e pré-preencher `customerProductCode`/`customerProductDescription` com os rótulos do OwnerProduct (editáveis).
4. O seletor de pool DEVE listar pools da mesma base e que permitam o produto, conforme a resposta dos endpoints de Pool (questão em aberto 1).
5. O Contract_Form DEVE validar localmente: `effectiveTo > effectiveFrom`; `effectiveUntil > effectiveFrom`; revisão dentro da vigência do contrato; `maximumCapacity ≥ reservedCapacity`; `maximumQuota ≥ minimumQuota`; ao menos 1 item; ao menos 1 `allowedMovementTypeCodes`; **um produto por pool** na revisão.
6. Quantidades DEVEM ser enviadas como Decimal_String (até 3 casas, ponto, não negativas); percentuais como string com até 4 casas e ≤ 100; `accountingMeasure` ∈ {`GOV`,`GSV`,`MASS`}.
7. Datas DEVEM ser enviadas em ISO-8601 UTC (`toISOString()`); `effectiveTo`/`effectiveUntil` ausentes ou `null` = indeterminado.
8. O body DEVE conter somente campos conhecidos (a API rejeita campos extras com 400).
9. QUANDO a API responder 201, O Contract_Form DEVE navegar para o detalhe do contrato criado.
10. SE a API responder 409 `Contract identity already exists`, ENTÃO O Contract_Form DEVE marcar `internalCode`/`contractNumber` como já existentes.
11. SE a API responder 403 na criação (fora do escopo), ENTÃO O Contract_Form DEVE exibir "Sem permissão para criar contrato nesta base/depositante".
12. SE a API responder 400/404 de Owner/base/produto/pool inativo ou sem vínculo, ENTÃO O Contract_Form DEVE exibir a mensagem da API e manter os dados digitados.

### Requisito 5: Edição de rascunho (substituição completa)

**História de usuário:** Como gestor, quero editar um rascunho sem perder itens.

#### Critérios de Aceitação

1. A edição DEVE estar disponível apenas para contratos `DRAFT`; para os demais, o botão DEVE ficar oculto.
2. O Contract_Form de edição DEVE ser inicializado a partir de `GET /rest/contracts/:id` (revisão em rascunho) e enviar `PATCH /rest/contracts/:id` com o corpo **completo**, inclusive todos os itens (Full_Replace).
3. SE a API responder 400 `Only DRAFT contracts can be edited`, ENTÃO O Contract_Form DEVE informar que o contrato mudou de status e recarregar o detalhe.
4. SE a API responder 404 (fora do escopo/inexistente), ENTÃO A página DEVE exibir mensagem e voltar à listagem.

### Requisito 6: Ações de status

**História de usuário:** Como gestor, quero conduzir o ciclo de vida do contrato com segurança.

#### Critérios de Aceitação

1. A Contract_Detail_Page DEVE exibir as ações conforme o status: DRAFT (Editar, Enviar p/ aprovação, Cancelar); PENDING_APPROVAL (Aprovar, Cancelar); ACTIVE (Suspender, Iniciar encerramento, Nova revisão); SUSPENDED (Reativar, Iniciar encerramento, Cancelar, Nova revisão); CLOSING (Encerrar); demais estados, somente leitura.
2. A UI NÃO DEVE oferecer "Cancelar" para contrato `ACTIVE` (precisa passar por CLOSING → CLOSED).
3. Cada ação DEVE abrir modal que exige `justification` não vazia, exceto "Enviar p/ aprovação" (opcional); o corpo DEVE conter somente `justification` e, no approve, `stockDeclaration`.
4. QUANDO a ação for "Aprovar", O modal DEVE oferecer `stockDeclaration` (`ZERO` | `PREEXISTING_STOCK`) e explicar que é obrigatório quando a base já passou por cutover.
5. O Contracts_Service DEVE aceitar qualquer 2xx nas ações `POST` (a API responde 201).
6. SE a API responder 400 `Invalid contract transition: X -> Y`, ENTÃO A página DEVE recarregar o detalhe e informar que o status mudou.
7. SE a API responder 409 `Opening declaration missing for contract item <id>`, ENTÃO O modal DEVE exibir a mensagem e manter-se aberto.
8. SE a API responder 409 `Contract has non-zero custody exposure` ao encerrar, ENTÃO O modal DEVE explicar que há saldo/posição diferente de zero.
9. As ações DEVEM respeitar permissões (Requisito 9) e tratar 403 sem quebrar a página.
10. Após qualquer ação bem-sucedida, A página DEVE recarregar o detalhe.

### Requisito 7: Nova revisão

**História de usuário:** Como gestor, quero criar uma revisão futura para ajustar cotas e itens.

#### Critérios de Aceitação

1. "Nova revisão" DEVE estar disponível apenas para `ACTIVE` e `SUSPENDED` com revisão corrente aprovada.
2. O formulário DEVE ser pré-preenchido com os itens da revisão corrente e exigir `justification`.
3. O Contracts_Service DEVE enviar `POST /rest/contracts/:id/revisions` com a revisão **completa** (todos os itens).
4. O formulário DEVE validar localmente que `effectiveFrom` é posterior a todas as revisões existentes.
5. SE a API responder 409 `Contract item has non-zero custody exposure`, ENTÃO O formulário DEVE informar que o item removido tem saldo/exposição diferente de zero.
6. A Contract_Detail_Page DEVE explicar que a revisão nasce aprovada, mas só passa a valer na data de vigência.

### Requisito 8: Depositantes (Owner) e produtos do depositante

**História de usuário:** Como gestor, quero conferir e manter os produtos habilitados do depositante, pois são pré-requisito dos itens.

#### Critérios de Aceitação

1. O Owners_Service DEVE listar Owners (`GET /rest/owners?page&limit&status&internalCode&cnpj`) e buscar um Owner (`GET /rest/owners/:id`).
2. O Owners_Service DEVE listar os produtos do Owner (`GET /rest/owners/:ownerId/products`).
3. ONDE o usuário tiver permissão de escrita, A Contract_Detail_Page (ou um painel "Produtos do depositante") DEVE permitir vincular produto ao Owner (`POST /rest/owners/:ownerId/products` com `productId` e ao menos um entre `customerProductCode` e `customerProductDescription`), editar rótulos (`PATCH`) e desvincular (`DELETE`).
4. SE a API responder 409 `Owner product already exists`, ENTÃO A UI DEVE informar que o vínculo já existe.
5. A UI DEVE informar que editar rótulos do OwnerProduct **não altera** itens de contrato já gravados.
6. CRUD de Owner (criar/editar/ativar) está **fora de escopo**.

### Requisito 9: Permissões e escopo

**História de usuário:** Como gestor de acessos, quero que cada ação respeite sua permissão.

#### Critérios de Aceitação

1. A rota `/contratos` DEVE continuar protegida por `portal_nave:contracts:read`; `/contratos/novo` e `/contratos/:id/editar`, por `portal_nave:contracts:write`; `/contratos/:id`, por `portal_nave:contracts:read`.
2. A UI DEVE controlar botões por: criar/editar/enviar/revisão → `portal_nave:contracts:write`; aprovar → `portal_nave:contracts:approve`; suspender/reativar/iniciar encerramento/encerrar/cancelar → `portal_nave:contracts:status`. Admin mantém bypass.
3. SE a API responder 403 (`User '<id>' does not have required permissions: ...`), ENTÃO A UI DEVE exibir "Você não tem permissão para esta ação" sem expor o texto técnico.
4. `docs/rbac-portal-nave.md` DEVE documentar as novas chaves (`approve`, `status`), registrando a questão em aberto 3.
5. A UI NÃO DEVE tratar `rows: []` como erro; DEVE respeitar o escopo por base/CNPJ aplicado pelo back.

### Requisito 10: Tipos, serviços e substituição do mock

**História de usuário:** Como desenvolvedor, quero uma camada de serviço tipada e testada, e remover o mock.

#### Critérios de Aceitação

1. DEVE existir `src/features/contracts/services/contract.ts` com tipos (`ContractResponse`, `RevisionResponse`, `ItemResponse`, `CreateContractRequest`, `ContractActionRequest`, `OwnerResponse`, `OwnerProductResponse`), enums de status e `CONTRACTS_ENDPOINTS` (prefixo `/rest`).
2. `ContractsService` e `OwnersService` DEVEM depender de `IHttpService` e ser registrados no IoC (`contracts`, `owners`) com declaration merging em `AppServices`.
3. O formulário mock e os campos sem correspondência na API (`capacidadeEstatica`, `reservaMinimaEac`, `giroMinimo`, etc.) DEVEM ser removidos de `ContractsPage`.
4. Helpers de conversão DEVEM existir e ser testados: `toDecimalString`, `isValidDecimalString`, `isValidPercentString`, `toIsoUtc`, `allowedActions(status)`.
5. Os serviços DEVEM ser testados com `http` mockado: query estrita, corpo sem campos extras, aceitação de 201 nas ações, mapeamento de campos nulos, resolução cliente→owners por CNPJ, propagação de `AppError`.

## Atualização pós-implementação

**Questões em aberto — respostas do back**
1. **Bases e pools:** `GET /rest/operational-catalog/bases|tanks` e `GET /rest/pools` (ver `docs/frontend-integration/contratos-apoio-permissoes.md`). Implementados em `ReferenceService`.
2. **Forma de `Contract` na listagem:** cada linha é o objeto completo do detalhe (com `owner`, `currentRevision` e `revisions[]`); envelope `{ rows, total }`. Campos opcionais vêm omitidos, não `null`.
3. **Permissões:** o back valida `app:custody:*`; o front usa `portal_nave:contracts:{read,write,approve,status}` só para UX. O seed atual dá `write/approve/status` apenas ao administrador (pendência no back).
4. **Tela antiga:** formulário mock removido.
5. **Tipos de movimento (nova):** sem lista oficial; pendente com quem mantém o supervisório.

**Ajustes de requisitos**
- **4.4 / 8.2:** produtos do depositante vêm como `{ id (vínculo), product: { id, sapCode, name }, ... }`; `productId` do item = `product.id`.
- **2.3:** o filtro por cliente percorre todas as páginas de cada depositante e pagina no front (o back só filtra por `ownerId`).
- **3.2:** nomes de pool resolvidos por `GET /pools?source&baseCode`; sem `pool:read` (403), exibe o início do id.
- **7:** a nova revisão é uma página (`/contratos/:id/nova-revisao`), não um modal.
- Todos os requisitos 1 a 10 estão implementados; falta o smoke test contra a API real. Detalhes em `tasks.md`.
