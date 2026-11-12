# Documento de Requisitos

## Introdução

Esta feature atualiza a integração da tela **Cadastro de clientes** (`/registrations/clients`) do `frontend-portal-nave` com a API de clientes do `mw-nave`, conforme o guia `docs/frontend-integration/clientes.md`. É a **primeira de três specs** (Clientes → Produtos → Contratos) e define as bases de contrato (tipos, endpoints, tratamento de erros) que as duas seguintes reutilizam.

### Estado atual (verificado no código)

- `ClientRegistrationService` usa `GET /rest/clients/all`, `POST /rest/clients`, `PATCH /rest/clients/:id` e `DELETE /rest/clients/:id`.
- Na criação, `cnpj.branches` é sempre `[]`; na edição, as filiais existentes são apenas reenviadas — **não há UI para ver ou editar filiais**.
- A tela só edita `cnpj.headquarters`, `name`, `bp` e `isActive`. **Não exibe nem edita produtos vinculados** (`productIds`) e **não exibe contratos**.
- `errorMessage()` trata todo 409 como "Já existe um cliente com este CNPJ", mas a API também devolve 409 para **BP duplicado** e para `productIds` repetidos — e as mensagens de 409 já vêm em português e podem ser exibidas direto.
- Não há controle de escrita: a rota exige apenas `portal_nave:client_registry:read` e os botões Novo/Editar/Remover ficam sempre visíveis.
- `src/features/products/services/contract.ts` guarda os tipos e `PRODUCTS_ENDPOINTS` compartilhados de produtos e clientes (sem o campo `contracts`).

### Relação Cliente × Contrato (resposta à dúvida do escopo)

**Existe relação, mas é lógica, não uma FK.** O contrato referencia um **Owner** (depositante, `ownerId`), não o `Client`. O vínculo é: `owner.cnpj` ∈ {CNPJ da matriz + CNPJs das filiais} do cliente (comparação normalizada, sem máscara). Consequências para esta spec:

1. O cliente só "enxerga" seus contratos via `contractFields` em `GET /clients` / `GET /clients/:id`.
2. Essa rota **não aplica o escopo de custódia**; a listagem oficial é `GET /rest/contracts` (spec 3).
3. Excluir cliente **não verifica contratos** (não há FK).
4. Por isso as **filiais importam**: um contrato de Owner com CNPJ de filial também aparece para o cliente.

### Fora de escopo

- Implementação no back-end; telas de Produtos (spec 2) e Contratos (spec 3).
- Cadastro de Owner (depositante) — tratado na spec 3.

## Glossário

- **Clients_Page**: `ClientRegistrationPage.tsx`, tela de cadastro de clientes.
- **Client_Service**: `IClientRegistrationService` / `ClientRegistrationService`, resolvido do IoC como `clientRegistration`.
- **Clients_API**: endpoints `/rest/clients` do `mw-nave`.
- **Client**: cliente (`id` UUID, `name`, `bp`, `cnpj.headquarters`, `cnpj.branches[]`, `isActive`).
- **Branch**: CNPJ de filial do cliente (sem unicidade nem checagem contra a matriz).
- **Linked_Product**: produto vinculado ao cliente (N:N cadastral, via `productIds`).
- **Contract_Summary**: subconjunto de campos de contrato devolvido em `contracts` quando `contractFields` é enviado.
- **Full_Replace**: regra de substituição total do PATCH — `cnpj.branches` e `productIds`, quando enviados, substituem todo o conjunto; omitidos não alteram; `[]` remove todos.
- **Write_Permission**: permissão de escrita da tela (ver Requisito 9).

## Requisitos

### Requisito 1: Listagem de clientes

**História de usuário:** Como usuário do portal, quero ver os clientes cadastrados com seus dados principais, para localizar rapidamente um cadastro.

#### Critérios de Aceitação

1. QUANDO a Clients_Page for aberta, O Client_Service DEVE carregar os clientes por `GET /rest/clients/all` e exibir nome, CNPJ da matriz formatado, BP, quantidade de filiais e situação (Ativo/Inativo).
2. ENQUANTO a primeira carga estiver pendente, A Clients_Page DEVE exibir skeleton de tabela; durante recargas após mutação, DEVE exibir o estado `loading` da própria tabela.
3. SE a carga falhar, ENTÃO A Clients_Page DEVE exibir mensagem de erro com ação "Tentar novamente".
4. QUANDO não houver clientes, A Clients_Page DEVE exibir "Nenhum cliente cadastrado".
5. A listagem NÃO DEVE depender de `products` nas linhas (a API não os devolve em `/clients/all`).

### Requisito 2: Criação de cliente

**História de usuário:** Como administrador, quero cadastrar um cliente com matriz e filiais, para que ele fique completo desde o início.

#### Critérios de Aceitação

1. O formulário DEVE exigir `name` (não vazio), `bp` (não vazio) e CNPJ da matriz válido (dígitos verificadores, numérico ou alfanumérico).
2. QUANDO o usuário salvar, O Client_Service DEVE enviar `POST /rest/clients` com CNPJs **sem máscara** (somente caracteres alfanuméricos em maiúsculas) para evitar duplicidade "mascarado × não mascarado".
3. O formulário DEVE permitir informar zero ou mais filiais, cada uma validada com o mesmo algoritmo de CNPJ, sem duplicatas na lista.
4. O formulário NÃO DEVE enviar `productIds` na criação (o vínculo de produtos só existe via PATCH).
5. QUANDO a API responder 201, A Clients_Page DEVE fechar o formulário, exibir confirmação e recarregar a lista.
6. O valor padrão de `isActive` DEVE ser `true`.

### Requisito 3: Edição de cliente com substituição total

**História de usuário:** Como administrador, quero editar um cliente sem perder filiais ou vínculos existentes, para evitar apagar dados por engano.

#### Critérios de Aceitação

1. QUANDO o usuário editar um cliente, O formulário DEVE ser pré-preenchido com os dados atuais, incluindo as filiais.
2. QUANDO o PATCH enviar `cnpj`, O Client_Service DEVE enviar sempre a lista **completa** de filiais (Full_Replace), nunca apenas as alteradas.
3. QUANDO o usuário remover todas as filiais explicitamente, O Client_Service DEVE enviar `branches: []`.
4. QUANDO o usuário não alterar os produtos vinculados, O Client_Service NÃO DEVE enviar `productIds`.
5. QUANDO o usuário alterar apenas `isActive`, A Clients_Page DEVE tratar como alteração de flag, sem efeito colateral em contratos.
6. SE o cliente tiver sido removido por outra sessão (404), ENTÃO A Clients_Page DEVE informar que o cadastro não existe mais e recarregar a lista.

### Requisito 4: Gestão de filiais na UI

**História de usuário:** Como administrador, quero adicionar e remover filiais, porque contratos de Owners com CNPJ de filial pertencem ao cliente.

#### Critérios de Aceitação

1. O formulário DEVE listar as filiais com máscara de exibição e permitir adicionar e remover itens.
2. QUANDO uma filial for adicionada, A Clients_Page DEVE validar o CNPJ e rejeitar valor igual a outra filial da lista.
3. A Clients_Page DEVE exibir um aviso informativo de que as filiais determinam quais contratos aparecem para o cliente.
4. A Clients_Page NÃO DEVE bloquear filial igual à matriz (a API não valida), mas DEVE exibir aviso não bloqueante.

### Requisito 5: Vínculo de produtos do cliente (catálogo)

**História de usuário:** Como administrador, quero escolher quais produtos do catálogo o cliente atende, para manter o cadastro coerente.

#### Critérios de Aceitação

1. QUANDO o usuário abrir o detalhe/edição de um cliente, O Client_Service DEVE buscar `GET /rest/clients/:id` para obter `products`.
2. O formulário DEVE listar os produtos disponíveis (`GET /rest/products/all`) e permitir marcar/desmarcar.
3. QUANDO o usuário confirmar a alteração de produtos, O Client_Service DEVE enviar `productIds` com a lista **completa** (existentes + novos − removidos).
4. SE o usuário desmarcar todos, ENTÃO O Client_Service DEVE enviar `productIds: []`.
5. A Clients_Page DEVE deixar claro, em texto de ajuda, que este vínculo é **cadastral** e **não habilita o produto em contratos** (isso é o vínculo do Owner, spec 3).
6. SE a API responder 404 por produto inexistente ou 409 por `productIds` repetido, ENTÃO A Clients_Page DEVE exibir a mensagem da API e manter o formulário aberto.

### Requisito 6: Contratos do cliente (somente leitura)

**História de usuário:** Como usuário do portal, quero ver os contratos ligados a um cliente, para entender sua situação contratual sem sair do cadastro.

#### Critérios de Aceitação

1. QUANDO o detalhe do cliente for aberto, O Client_Service DEVE chamar `GET /rest/clients/:id?contractFields=id,contractNumber,status,effectiveFrom,effectiveTo`.
2. A Clients_Page DEVE exibir os contratos em tabela somente leitura (número, status, vigência) e "Nenhum contrato vinculado" quando `contracts` for `[]`.
3. QUANDO `contracts` estiver ausente na resposta, A Clients_Page DEVE tratar como "indisponível" e não como erro.
4. O Client_Service DEVE solicitar somente campos válidos de `contractFields` (`id, internalCode, contractNumber, ownerId, source, baseCode, status, effectiveFrom, effectiveTo, createdBy, currentRevisionId, createdAt, updatedAt`), pois campos inválidos são ignorados em silêncio.
5. A Clients_Page DEVE indicar que o vínculo é feito por CNPJ (matriz + filiais) e que a lista **pode diferir** da listagem oficial de contratos, que aplica escopo de custódia.
6. QUANDO o usuário tiver permissão de leitura de contratos, A Clients_Page DEVE oferecer navegação para `/contratos` filtrada pelo cliente (rota definida na spec 3).
7. Campos nulos DEVEM ser tratados como `undefined`; datas ISO-8601 DEVEM ser exibidas no formato local.

### Requisito 7: Exclusão de cliente

**História de usuário:** Como administrador, quero confirmar a exclusão sabendo o que será afetado, para evitar remoções indevidas.

#### Critérios de Aceitação

1. ANTES de excluir, A Clients_Page DEVE exibir confirmação com o nome do cliente.
2. A confirmação DEVE informar que a exclusão é definitiva, remove filiais e vínculos com produtos (os produtos permanecem) e **não verifica contratos**.
3. QUANDO o detalhe já tiver sido carregado e `contracts` não estiver vazio, A confirmação DEVE exibir destaque de alerta com a quantidade de contratos associados por CNPJ.
4. QUANDO a API responder 200 `{ "success": true }`, A Clients_Page DEVE recarregar a lista e exibir confirmação.

### Requisito 8: Tratamento de erros

**História de usuário:** Como usuário, quero mensagens claras quando algo falhar, para corrigir o problema sem suporte.

#### Critérios de Aceitação

1. QUANDO a API responder 409, A Clients_Page DEVE exibir a `message` devolvida (já em português: BP duplicado, CNPJ da matriz duplicado, `productIds` repetido).
2. QUANDO a API responder 400, A Clients_Page DEVE exibir "Dados inválidos. Revise os campos informados." e, se a mensagem indicar `CNPJ inválido`, marcar o campo correspondente.
3. QUANDO a API responder 401, A Clients_Page DEVE delegar ao fluxo global de autenticação, sem mensagem local.
4. QUANDO a API responder 404, A Clients_Page DEVE exibir "Cliente não encontrado" e recarregar a lista.
5. O Client_Service DEVE propagar `AppError` (com `status`) para que a página decida a mensagem.

### Requisito 9: Permissões

**História de usuário:** Como gestor de acessos, quero que apenas quem pode escrever veja ações de escrita, para respeitar o RBAC.

#### Critérios de Aceitação

1. A rota `/registrations/clients` DEVE continuar protegida por `portal_nave:client_registry:read`.
2. ONDE a Write_Permission (`portal_nave:client_registry:write`) estiver registrada no RBAC, A Clients_Page DEVE exibir "Novo cliente", "Editar" e "Remover" somente a usuários que a possuam (via `authByPermission`); admin mantém bypass.
3. SE a Write_Permission não possuir o usuário, ENTÃO A Clients_Page DEVE exibir a lista e o detalhe em modo leitura.
4. A documentação `docs/rbac-portal-nave.md` DEVE ser atualizada com a nova permissão.

> **Questão em aberto:** a chave `portal_nave:client_registry:write` precisa ser cadastrada no console RBAC antes do deploy; hoje o back de clientes **não aplica RBAC por rota** (qualquer autenticado escreve), então o controle é apenas de UX.

### Requisito 10: Contrato de tipos e endpoints compartilhados

**História de usuário:** Como desenvolvedor, quero tipos e endpoints centralizados, para que as specs de Produtos e Contratos reutilizem o mesmo contrato.

#### Critérios de Aceitação

1. `PRODUCTS_ENDPOINTS` e os tipos de cliente DEVEM refletir `docs/frontend-integration/clientes.md`, incluindo `contracts?` em `ClientResponse` e o tipo `ClientContractSummary`.
2. O Client_Service DEVE expor `get(id, options?)` (detalhe com `products` e, opcionalmente, `contracts`) além de `list/create/update/remove`.
3. `ClientRecord` DEVE incluir `branches`, `products?` e `contracts?`.
4. O CNPJ DEVE ser sempre normalizado (`normalizeCnpj`) antes de ir para a API e formatado (`formatCnpj`) apenas na UI.
5. O Client_Service DEVE ser testado com `http` mockado para: mapeamento, envio sem máscara, Full_Replace de filiais e de produtos, `contractFields` e propagação de erros.

## Atualização pós-implementação

- **Requisito 9 (permissões de escrita)** não foi implementado: o back de clientes não aplica RBAC por rota e a chave `portal_nave:client_registry:write` não foi criada. Detalhes e demais divergências em `tasks.md` (seção "Status da implementação").
- **Requisito 8.1/8.2/8.4** estão atendidos em `errorMessage()` na página, sem módulo próprio nem teste unitário.
- Demais requisitos (1 a 7 e 10) estão implementados.
