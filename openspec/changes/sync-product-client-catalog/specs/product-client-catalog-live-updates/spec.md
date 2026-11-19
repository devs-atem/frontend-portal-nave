# Spec Delta

## Purpose

Mantém o Portal Nave atualizado quando produtos, clientes e vínculos produto-cliente são alterados no Nave ou sincronizados a partir do Supervisorio.

## ADDED Requirements

### Requirement: Refresh product and client views on catalog events
O Portal Nave SHALL atualizar automaticamente as consultas de produto, cliente e seus vínculos quando receber uma notificação de catálogo aplicada pelo mw-nave.

#### Scenario: Product state changes remotely
- **WHEN** um evento atualiza o nome ou código SAP de um produto
- **THEN** as listagens e detalhes de produto abertos SHALL refletir os novos campos sem recarga manual

#### Scenario: Product-client link changes remotely
- **WHEN** um evento cria, desativa ou reativa um vínculo produto-cliente
- **THEN** as visões por produto e por cliente SHALL refletir o vínculo e seu status sem recarga manual

#### Scenario: Client BP changes
- **WHEN** um evento aplicado atualiza o BP que identifica um cliente
- **THEN** as consultas afetadas SHALL ser invalidadas e recarregadas usando o BP atualizado

### Requirement: Preserve local product and client behavior
Atualizações em tempo real SHALL atualizar as consultas existentes sem alterar validações, campos ou ações locais de produtos e clientes que não foram modificados pelo evento.

#### Scenario: Event affects another product
- **WHEN** chega uma notificação de um produto diferente do detalhe atualmente aberto
- **THEN** o Portal SHALL atualizar a listagem correspondente sem substituir o formulário em edição

#### Scenario: Event stream disconnects
- **WHEN** o canal em tempo real fica indisponível
- **THEN** o Portal SHALL reconectar conforme o comportamento SSE existente e preservar o uso das consultas HTTP

### Requirement: Manage independent client-product status
O Portal Nave SHALL exibir e permitir a alteração do status de cada vínculo produto-cliente sem alterar o produto genérico ou os outros vínculos do mesmo cliente.

#### Scenario: Client product is deactivated
- **WHEN** o usuário desativa o produto para um cliente
- **THEN** somente o vínculo identificado por código SAP do produto e BP SHALL ficar inativo e a mudança SHALL ser publicada para sincronização

#### Scenario: Client product is reactivated
- **WHEN** o usuário reativa um vínculo inativo
- **THEN** somente esse vínculo SHALL ficar ativo e a mudança SHALL ser publicada para sincronização
