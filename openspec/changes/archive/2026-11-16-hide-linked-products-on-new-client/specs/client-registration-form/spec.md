## Purpose

Define o comportamento do modal de formulário de cadastro e edição de clientes, incluindo quais seções são exibidas em cada modo.

## ADDED Requirements

### Requirement: Seção "Produtos vinculados" restrita à edição
O modal de formulário de cliente SHALL exibir a seção "Produtos vinculados" apenas ao editar um cliente existente, e MUST NOT exibi-la ao cadastrar um novo cliente.

#### Scenario: Novo cliente
- **WHEN** o usuário abre o modal para cadastrar um novo cliente
- **THEN** o modal não exibe o título "Produtos vinculados" nem o aviso "Disponível após o cadastro"

#### Scenario: Edição de cliente
- **WHEN** o usuário abre o modal para editar um cliente existente
- **THEN** o modal exibe a seção "Produtos vinculados" com busca e seleção de produtos

#### Scenario: Detalhe do cliente
- **WHEN** o usuário abre o modal de detalhe de um cliente
- **THEN** a seção "Produtos vinculados" continua exibida em modo leitura
