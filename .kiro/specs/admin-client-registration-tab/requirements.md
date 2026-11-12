# Requirements Document

## Introduction

Atualmente o cadastro de clientes do portal é um módulo autônomo
(`src/features/client-registration/`) acessível por um item próprio no menu
lateral ("Cadastro de clientes") e por uma rota dedicada (`/registrations/clients`),
protegida pela permissão `portal_nave:client_registry:read`. Em paralelo, existe a
página "Administração" (`src/features/admin/`), composta por um conjunto de abas
(`CustomTabs`) com as seções administrativas do portal.

Esta funcionalidade consolida o cadastro de clientes como uma nova **aba** dentro da
página "Administração", alinhando-o às demais seções administrativas. Após a mudança,
o cadastro de clientes deixa de ter item de menu e rota próprios e passa a ser
acessível **exclusivamente** pela aba dentro da Administração. Todas as capacidades
atuais de CRUD (criar, editar, remover), a máscara e validação de CNPJ, as mensagens
de retorno (toasts) e a exibição de situação do cliente são preservadas. O acesso
restrito a administradores também é preservado.

Não há backend: o `ClientRegistrationService` permanece como mock em memória.

## Glossary

- **Portal**: Aplicação frontend `frontend-portal-nave` (React 19 + TypeScript + Vite).
- **Pagina_Administracao**: Página renderizada pelo componente `AdminPage`
  (`src/features/admin/pages/AdminPage.tsx`), acessível pela rota `/admin`, que agrupa
  seções administrativas em um componente `CustomTabs`.
- **Aba_Clientes**: Nova aba, inserida na `Pagina_Administracao`, que apresenta a
  interface de cadastro de clientes (tabela, ações e formulário em modal).
- **Modulo_Admin**: Módulo de feature `admin` (`src/features/admin/module.tsx`), que
  registra a rota `/admin` e o item de menu "Administração".
- **Modulo_Cadastro_Clientes**: Módulo de feature `client-registration`
  (`src/features/client-registration/`), que hoje registra a rota
  `/registrations/clients`, o item de menu "Cadastro de clientes" e o service
  `clientRegistration` no IoC.
- **Servico_Cadastro_Clientes**: Instância de `ClientRegistrationService` registrada
  no container IoC sob a chave `clientRegistration`, responsável pelo CRUD em memória
  de clientes.
- **Registro_Cliente**: Entidade `ClientRecord` com os campos `id`, `cnpj`, `name`,
  `bpid` e `active`.
- **IoC**: Container de injeção de dependência do Portal, acessado via o hook
  `useIoC` (`src/shared/hooks/useIoC.ts`).
- **AppServices**: Interface TypeScript em `@core/ioc/registry` estendida por
  _declaration merging_ para tipar os serviços registrados no IoC.
- **Permissao_Cadastro_Clientes**: Permissão RBAC `portal_nave:client_registry:read`,
  que hoje restringe o acesso ao Modulo_Cadastro_Clientes a administradores.
- **RouteGuard**: Componente (`@core/router/RouteGuard`) que bloqueia a renderização
  de uma rota conforme regras de permissão.
- **CNPJ_Valido**: Sequência de exatamente 14 dígitos numéricos (desconsiderando os
  caracteres de máscara `.`, `/` e `-`).

## Requirements

### Requirement 1: Exibir o cadastro de clientes como aba na Administração

**User Story:** Como administrador do Portal, quero acessar o cadastro de clientes
como uma aba dentro da página "Administração", para gerenciar os clientes no mesmo
lugar das demais configurações administrativas.

#### Acceptance Criteria

1. THE Pagina_Administracao SHALL exibir uma aba denominada "Cadastro de clientes"
   no componente `CustomTabs`, junto às abas existentes.
2. WHEN o administrador seleciona a Aba_Clientes, THE Pagina_Administracao SHALL
   renderizar a interface de cadastro de clientes no painel correspondente à aba.
3. THE Aba_Clientes SHALL exibir uma tabela de clientes com as colunas "Nome",
   "CNPJ", "BPID" e "Situação".
4. THE Aba_Clientes SHALL exibir, para cada Registro_Cliente, a situação como "Ativo"
   quando o campo `active` for verdadeiro e "Inativo" quando o campo `active` for falso.
5. WHEN não existe nenhum Registro_Cliente cadastrado, THE Aba_Clientes SHALL exibir a
   mensagem "Nenhum cliente cadastrado".
6. THE Aba_Clientes SHALL disponibilizar um controle "+ Novo cliente" para iniciar o
   cadastro de um novo Registro_Cliente.

### Requirement 2: Remover o acesso autônomo ao cadastro de clientes

**User Story:** Como administrador do Portal, quero que o cadastro de clientes seja
acessível apenas pela aba na Administração, para evitar pontos de acesso duplicados no
menu e nas rotas.

#### Acceptance Criteria

1. THE Portal SHALL remover o item de menu lateral "Cadastro de clientes".
2. THE Portal SHALL remover a rota `/registrations/clients`.
3. WHEN um usuário navega para o caminho `/registrations/clients`, THE Portal SHALL
   tratar o caminho como rota inexistente, exibindo o tratamento padrão de rota não
   encontrada.
4. THE Portal SHALL manter o acesso ao cadastro de clientes exclusivamente pela
   Aba_Clientes dentro da Pagina_Administracao.

### Requirement 3: Preservar o serviço de cadastro de clientes no IoC

**User Story:** Como desenvolvedor do Portal, quero que o Servico_Cadastro_Clientes
continue registrado e tipado no IoC, para que a Aba_Clientes execute as operações de
CRUD de forma tipada.

#### Acceptance Criteria

1. THE Portal SHALL manter o Servico_Cadastro_Clientes registrado no IoC sob a chave
   `clientRegistration`.
2. THE Portal SHALL manter a extensão da interface AppServices por _declaration
   merging_ que tipa a chave `clientRegistration` como `ClientRegistrationService`.
3. WHEN a Pagina_Administracao é renderizada, THE Pagina_Administracao SHALL obter o
   Servico_Cadastro_Clientes por meio de `useIoC("clientRegistration")`.
4. THE Pagina_Administracao SHALL manter o consumo do serviço existente obtido por
   `useIoC("armazenagem")`.

### Requirement 4: Cadastrar um novo cliente pela aba

**User Story:** Como administrador do Portal, quero cadastrar um novo cliente pela
Aba_Clientes, para incluir um cliente no portal.

#### Acceptance Criteria

1. WHEN o administrador aciona "+ Novo cliente", THE Aba_Clientes SHALL abrir um modal
   de cadastro com os campos "CNPJ", "Nome" e "BPID" vazios.
2. WHILE o administrador digita no campo "CNPJ", THE Aba_Clientes SHALL aplicar a
   máscara `00.000.000/0000-00` sobre os dígitos informados, limitando a 14 dígitos.
3. WHEN o administrador confirma o cadastro com um CNPJ_Valido e com os campos "Nome"
   e "BPID" preenchidos, THE Servico_Cadastro_Clientes SHALL criar um novo
   Registro_Cliente com situação "Ativo".
4. WHEN um novo Registro_Cliente é criado, THE Aba_Clientes SHALL fechar o modal,
   atualizar a tabela de clientes e exibir a mensagem de sucesso "Cliente cadastrado.".

### Requirement 5: Editar um cliente existente pela aba

**User Story:** Como administrador do Portal, quero editar os dados de um cliente pela
Aba_Clientes, para manter as informações cadastrais atualizadas.

#### Acceptance Criteria

1. WHEN o administrador aciona a ação "Editar" de um Registro_Cliente, THE Aba_Clientes
   SHALL abrir o modal preenchido com os valores atuais de "CNPJ", "Nome" e "BPID" do
   Registro_Cliente selecionado.
2. WHEN o administrador confirma a edição com um CNPJ_Valido e com os campos "Nome" e
   "BPID" preenchidos, THE Servico_Cadastro_Clientes SHALL atualizar o Registro_Cliente
   correspondente com os valores informados.
3. WHEN um Registro_Cliente é atualizado, THE Aba_Clientes SHALL fechar o modal,
   atualizar a tabela de clientes e exibir a mensagem de sucesso "Cliente atualizado.".

### Requirement 6: Remover um cliente pela aba

**User Story:** Como administrador do Portal, quero remover um cliente pela
Aba_Clientes, para descontinuar clientes que não devem permanecer no portal.

#### Acceptance Criteria

1. WHEN o administrador aciona a ação "Remover" de um Registro_Cliente, THE
   Servico_Cadastro_Clientes SHALL excluir o Registro_Cliente correspondente.
2. WHEN um Registro_Cliente é removido, THE Aba_Clientes SHALL atualizar a tabela de
   clientes e exibir a mensagem de sucesso no formato `Cliente "<nome>" removido.`,
   em que `<nome>` é o campo `name` do Registro_Cliente removido.

### Requirement 7: Validar os dados do formulário de cliente

**User Story:** Como administrador do Portal, quero que o formulário valide os dados
antes de salvar, para evitar cadastros incompletos ou inconsistentes.

#### Acceptance Criteria

1. IF o administrador confirma o formulário com o campo "CNPJ" vazio, THEN THE
   Aba_Clientes SHALL exibir a mensagem "Informe o CNPJ." no campo "CNPJ" e impedir a
   gravação.
2. IF o administrador confirma o formulário com um CNPJ que possui número de dígitos
   diferente de 14, THEN THE Aba_Clientes SHALL exibir a mensagem "CNPJ deve ter 14
   dígitos." no campo "CNPJ" e impedir a gravação.
3. IF o administrador confirma o formulário com o campo "Nome" vazio ou composto apenas
   por espaços, THEN THE Aba_Clientes SHALL exibir a mensagem "Informe o nome do
   cliente." no campo "Nome" e impedir a gravação.
4. IF o administrador confirma o formulário com o campo "BPID" vazio ou composto apenas
   por espaços, THEN THE Aba_Clientes SHALL exibir a mensagem "Informe o BPID." no campo
   "BPID" e impedir a gravação.
5. IF o formulário possui ao menos um campo inválido no momento da confirmação, THEN THE
   Aba_Clientes SHALL exibir a mensagem de erro "Corrija os campos destacados." e manter
   o modal aberto.

### Requirement 8: Preservar o controle de acesso restrito a administradores

**User Story:** Como responsável pela segurança do Portal, quero que o cadastro de
clientes continue restrito a administradores após virar uma aba, para que o controle de
acesso existente não seja perdido.

#### Acceptance Criteria

1. THE Portal SHALL restringir o acesso à Pagina_Administracao e à Aba_Clientes a
   usuários que possuam a Permissao_Cadastro_Clientes.
2. IF um usuário sem a Permissao_Cadastro_Clientes tenta acessar a Pagina_Administracao,
   THEN THE Portal SHALL bloquear o acesso por meio do RouteGuard.
3. THE Portal SHALL manter o item de menu "Administração" visível apenas para usuários
   que possuam a Permissao_Cadastro_Clientes.
