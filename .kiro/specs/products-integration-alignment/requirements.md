# Documento de Requisitos

## Introdução

Esta feature atualiza a integração da tela **Produtos** (`/products`) do `frontend-portal-nave` com a API de produtos do `mw-nave`, conforme `docs/frontend-integration/produtos.md`. É a **segunda de três specs** (Clientes → Produtos → Contratos) e depende dos tipos e endpoints compartilhados definidos na spec `clients-integration-alignment`.

### Estado atual (verificado no código)

- `ProductsPage` é **somente leitura**: tabela expansível com duas visões ("Por produto" e "Por cliente"), busca, filtros de grupo e status, painel de detalhes. Não há criar, editar nem excluir produto.
- `ApiProductsDataSource.load()` faz `GET /rest/products/all`, `GET /rest/clients/all` e depois **um `GET /rest/products/:id` por produto** (N+1) para obter os clientes vinculados.
- A API só expõe `id`, `name`, `sapCode` (e `clients` no detalhe). O data source **inventa** `abbreviation: ""`, `group: ""`, `active: true` e uma cor derivada do id. Os filtros de grupo/status e a coluna "Grupo" não têm dados reais; a tag "Ativo/Inativo" é sempre "Ativo".
- `Cliente.id` no front é `number`; o data source usa ids numéricos substitutos mapeados para o UUID.
- Não há controle de permissão de escrita nem tratamento do 500 do `DELETE` de produto em uso.

### Relações relevantes (resposta à dúvida do escopo)

- **Produto ↔ Cliente (N:N)**: vínculo **cadastral/catálogo**, gerenciado por `clientIds` (aqui) ou `productIds` (em `PATCH /clients/:id`); ambos são substituição total.
- **Esse vínculo NÃO habilita o produto em contrato.** O que habilita é o **`OwnerProduct`** (Produto ↔ Owner), que também guarda os rótulos do cliente (`customerProductCode`/`customerProductDescription`). Cobertos na spec 3.
- **Produto → Contrato** ocorre pelos itens da revisão (`ContractRevisionItem`); `productCode` do item deve ser igual ao `sapCode` do produto.
- **Efeitos colaterais**: todo `PATCH /products/:id` republica `custody.contract.updated` dos contratos que usam o produto; alterar `sapCode` **não** atualiza o `productCode` já gravado nos itens existentes.

### Fora de escopo

- Back-end (incluindo a correção do 500 → 409 no `DELETE`, que fica como pedido ao back).
- Cadastro de `OwnerProduct` e uso do produto em contratos (spec 3).
- Cadastro de grupo, sigla ou status de produto (a API não suporta).

## Glossário

- **Products_Page**: `ProductsPage.tsx`.
- **Products_Data_Source**: `ProductsDataSource`, resolvido do IoC como `products`.
- **Products_API**: endpoints `/rest/products` do `mw-nave`.
- **Product**: produto (`id` UUID, `sapCode` único, `name`, `clients?`, `createdAt`, `updatedAt`).
- **Linked_Client**: cliente vinculado ao produto (N:N cadastral).
- **Full_Replace**: `clientIds`, quando enviado, substitui todo o conjunto; omitido não altera; `[]` desvincula todos.
- **Write_Permission**: `portal_nave:products:write`.
- **In_Use_Error**: falha de exclusão (500 hoje; 409 após correção no back) de produto usado em itens de contrato.

## Requisitos

### Requisito 1: Modelo de produto fiel à API

**História de usuário:** Como usuário do portal, quero ver apenas dados reais do produto, para não confiar em informações inventadas.

#### Critérios de Aceitação

1. A Products_Page DEVE exibir somente `name` e `sapCode` do produto, além da contagem de clientes vinculados.
2. A Products_Page NÃO DEVE exibir coluna "Grupo", filtro de grupo, filtro de status nem tag "Ativo/Inativo" para produtos, pois a API não fornece esses dados.
3. O Products_Data_Source NÃO DEVE preencher `abbreviation`, `group` ou `active` com valores fictícios.
4. A busca por texto DEVE casar `name` e `sapCode` (produto) e `name`, `bp` e CNPJ (cliente), sem diferenciar maiúsculas e ignorando espaços nas pontas.
5. A cor representativa do produto PODE continuar derivada do `id`, por ser puramente visual.
6. As visões "Por produto" e "Por cliente", a expansão de linhas, as contagens e a mensagem "Nenhum registro encontrado para os filtros aplicados" DEVEM ser preservadas.

> **Decisão registrada:** os filtros e campos fictícios saem da UI em vez de ficarem mortos. Se o back passar a expor grupo/status, uma nova spec os reintroduz.

### Requisito 2: Carga eficiente dos vínculos

**História de usuário:** Como usuário, quero que a tela carregue rápido, mesmo com muitos produtos e clientes.

> **Revisado após a implementação:** a versão original (carga completa por `/all` + detalhe do lado com menos registros, pool de concorrência de 6 e `refresh()` no data source) foi substituída por listagem paginada com detalhe sob demanda, quando a API passou a oferecer `GET /rest/products` e `GET /rest/clients` paginados. A carga inicial deixa de ter N+1 e não precisa de pool.

#### Critérios de Aceitação

1. A Products_Page DEVE carregar só a página corrente de cada visão: `GET /rest/products?page&limit` ("Por produto") e `GET /rest/clients?page&limit` ("Por cliente"), sem `/all` e sem detalhe por item.
2. Os vínculos N:N DEVEM ser carregados sob demanda, ao abrir o painel lateral: `GET /rest/products/:id` (clientes do produto) ou `GET /rest/clients/:id` (produtos do cliente), apenas do item aberto.
3. As listagens completas (`/rest/products/all`, `/rest/clients/all`) SÓ DEVEM ser chamadas pelos seletores dos diálogos de vínculo.
4. SE a listagem falhar, ENTÃO a página DEVE exibir mensagem de erro e "Tentar novamente". SE o detalhe falhar, ENTÃO o painel DEVE exibir estado de erro, sem mostrar vínculos parciais.
5. Após uma mutação bem-sucedida, a Products_Page DEVE recarregar a página corrente (`refresh` na página) e fechar o painel de detalhe.

### Requisito 3: Criação de produto

**História de usuário:** Como administrador, quero cadastrar um produto, para disponibilizá-lo no catálogo.

#### Critérios de Aceitação

1. O formulário DEVE exigir `name` e `sapCode` não vazios (após `trim`).
2. QUANDO o usuário salvar, O Products_Data_Source DEVE enviar `POST /rest/products` com `{ name, sapCode }`.
3. QUANDO a API responder 201, A Products_Page DEVE fechar o formulário, exibir confirmação e executar `refresh()`.
4. SE a API responder 409 `A product with sapCode "<x>" already exists`, ENTÃO A Products_Page DEVE exibir a mensagem no campo `sapCode` e manter o formulário aberto.
5. O formulário NÃO DEVE enviar `clientIds` na criação; o vínculo é feito pela edição (Requisito 5).

### Requisito 4: Edição de produto e alteração de `sapCode`

**História de usuário:** Como administrador, quero editar nome e código SAP com ciência dos efeitos, para não quebrar contratos existentes.

#### Critérios de Aceitação

1. O formulário de edição DEVE ser pré-preenchido com os dados do produto.
2. O Products_Data_Source DEVE enviar `PATCH /rest/products/:id` somente com os campos alterados.
3. QUANDO o usuário alterar `sapCode`, A Products_Page DEVE exibir confirmação informando que (a) o `productCode` já gravado nos itens de contratos existentes **não** é atualizado e (b) o `PATCH` republica o evento de todos os contratos que usam o produto.
4. A confirmação DEVE recomendar evitar alterar `sapCode` de produto em uso.
5. SE a API responder 409 de `sapCode` duplicado, ENTÃO A Products_Page DEVE exibir a mensagem da API no campo.
6. SE a API responder 404, ENTÃO A Products_Page DEVE informar que o produto não existe mais e executar `refresh()`.

> **Observação:** o front não consegue saber se o produto está em uso em contratos sem consultar a spec 3; por isso o aviso de `sapCode` é **sempre** exibido na alteração.

### Requisito 5: Vínculo de clientes do produto (catálogo)

**História de usuário:** Como administrador, quero definir quais clientes atendem cada produto.

#### Critérios de Aceitação

1. QUANDO o usuário abrir a edição de vínculos, A Products_Page DEVE partir dos Linked_Clients atuais do produto (do snapshot ou de `GET /rest/products/:id`).
2. O seletor DEVE listar todos os clientes, com busca, e permitir marcar/desmarcar.
3. QUANDO o usuário confirmar, O Products_Data_Source DEVE enviar `clientIds` com a lista **completa** (Full_Replace) em UUIDs reais, nunca com os ids numéricos substitutos.
4. SE todos forem desmarcados, ENTÃO O Products_Data_Source DEVE enviar `clientIds: []`.
5. QUANDO o usuário não alterar os vínculos, O Products_Data_Source NÃO DEVE enviar `clientIds`.
6. SE a API responder 404 (cliente inexistente) ou 409 (`clientIds` repetido/vínculo duplicado), ENTÃO A Products_Page DEVE exibir a mensagem da API e manter o formulário aberto.
7. A Products_Page DEVE exibir texto de ajuda de que este vínculo é **cadastral** e **não habilita o produto em contratos** (isso depende do vínculo do Owner).

### Requisito 6: Exclusão de produto

**História de usuário:** Como administrador, quero excluir um produto sem surpresas quando ele estiver em uso.

#### Critérios de Aceitação

1. ANTES de excluir, A Products_Page DEVE exibir confirmação com nome e `sapCode`, informando remoção em cascata dos vínculos com clientes e com Owners (`OwnerProduct`).
2. QUANDO a API responder 200 `{ "success": true }`, A Products_Page DEVE exibir confirmação e executar `refresh()`.
3. SE a exclusão falhar com 500 ou 409, ENTÃO A Products_Page DEVE exibir "Produto em uso em contratos e não pode ser excluído" e manter a lista inalterada.
4. A Products_Page NÃO DEVE exibir detalhes técnicos do 500 (código Prisma) ao usuário.

### Requisito 7: Permissões

**História de usuário:** Como gestor de acessos, quero separar leitura e escrita de produtos.

#### Critérios de Aceitação

1. A rota `/products` DEVE continuar protegida por `portal_nave:products:read`.
2. ONDE o usuário possuir `portal_nave:products:write` (ou for admin), A Products_Page DEVE exibir "Novo produto", "Editar", "Vínculos" e "Excluir".
3. SENÃO, A Products_Page DEVE operar em modo somente leitura.
4. `docs/rbac-portal-nave.md` DEVE documentar a nova chave.

> **Questão em aberto:** a chave deve ser cadastrada no console RBAC; o back de produtos não aplica RBAC por rota, então o controle é apenas de UX.

### Requisito 8: Tratamento de erros e estados

**História de usuário:** Como usuário, quero feedback claro em carga, erro e vazio.

#### Critérios de Aceitação

1. ENQUANTO a carga da página corrente estiver pendente, A Products_Page DEVE exibir skeleton de tabela.
2. SE a carga da página corrente falhar, ENTÃO A Products_Page DEVE exibir mensagem de erro e "Tentar novamente".
3. QUANDO a API responder 400, A Products_Page DEVE exibir "Dados inválidos. Revise os campos informados."
4. QUANDO a API responder 401, A Products_Page DEVE delegar ao fluxo global de autenticação.
5. Mensagens de 409 em português devolvidas pela API DEVEM ser exibidas diretamente.

### Requisito 9: Contrato de tipos e testes

**História de usuário:** Como desenvolvedor, quero tipos e testes coerentes com o contrato.

#### Critérios de Aceitação

1. `contract.ts` DEVE manter `CreateProductRequest` e `UpdateProductRequest` como únicos formatos de escrita de produto.
2. O Products_Data_Source DEVE expor `loadProductsPage`, `loadClientsPage`, `getProductDetail`, `getClientDetail`, `listAllClients`, `listAllProducts`, `createProduct`, `updateProduct`, `deleteProduct`, `updateClientProducts` e `clientUuidOf(clientId)`. A recarga após mutações é responsabilidade da página (não há `refresh()` no data source).
3. `ApiProductsDataSource` DEVE ser testado com `http` mockado: listagem paginada sem `/all` nem detalhe por item, detalhe sob demanda, falha de detalhe, mapeamento sem campos fictícios, reconciliação de ids substitutos, Full_Replace de `clientIds` com UUIDs, omissão de `clientIds`, `DELETE` com 500.

## Atualização pós-implementação

- **Requisito 7 (permissões de escrita)** não foi implementado: o back de produtos não aplica RBAC por rota e a chave `portal_nave:products:write` não foi criada.
- **Requisitos 2 e 9** foram revisados para refletir a carga paginada com detalhe sob demanda (o desenho original, de carga pelo lado menor com pool de concorrência e `refresh()` no data source, foi descartado). Na forma revisada, estão implementados.
- Requisitos 1, 3 a 6 e 8 estão implementados como escritos, com a ressalva de que o `refresh()` citado em 3.3, 4.6 e 6.2 é o da página. As ações de edição ficam no painel lateral do produto. Divergências em `tasks.md` ("Status da implementação").
