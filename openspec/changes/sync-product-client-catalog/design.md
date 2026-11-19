# Design

## Context

Consulte `proposal.md` e `specs/product-client-catalog-live-updates/spec.md`. A tela `ProductsPage` carrega páginas e detalhes sob demanda através de `ApiProductsDataSource`; as mutações chamam as APIs REST e recarregam a página ativa. O backend Nave ainda precisará expor notificações de catálogo após eventos locais/remotos.

## Goals / Non-Goals

**Goals:**
- Receber atualizações remotas sem recarga manual.
- Preservar a experiência de detalhes sob demanda e consultas HTTP existentes.

**Non-Goals:**
- Reimplementar transporte servidor-servidor ou aplicar eventos no navegador.
- Alterar permissões e operações locais do Portal.

## Decisions

### Notificação de invalidação

O frontend receberá notificação SSE com entidade e chave de produto/BP e invalidará as consultas correspondentes. Não aplicar payloads de domínio diretamente no cache: a API REST continua fonte de leitura, valida permissões e fornece detalhes normalizados.

Alternativa considerada: atualizar o cache diretamente com payloads; a invalidação reduz acoplamento ao contrato de eventos entre os serviços.

### Preservar estado de edição

Eventos atualizam páginas e detalhes em repouso. Se o usuário estiver editando um produto, preservar o formulário e atualizar após concluir/cancelar para evitar sobrescrever entrada não salva.

O status independente do vínculo será alterado por uma ação explícita nos diálogos/painéis atuais e enviado pela API Nave; o stream atualiza a relação na visão oposta após o commit.

### Edição de vínculos e status

Os diálogos de vínculo pré-selecionam só os vínculos ativos. No mw-nave, o `PATCH` com `clientIds`/`productIds` ativa os enviados e marca os ausentes como inativos, sem apagá-los. Enviar os inativos os reativaria, então eles ficam fora do conjunto e só mudam de status pela ação explícita de ativar/desativar. O status vem sempre de `linkIsActive`; se o campo faltar no detalhe, o Portal trata como erro em vez de presumir um valor.

### Reconexão e compatibilidade

Usar a infraestrutura HTTP/SSE existente e manter consultas REST como caminho inicial e fallback. Notificações repetidas são inofensivas porque invalidar uma query é idempotente.

## Risks / Trade-offs

- **Fluxo contínuo pode invalidar consultas com frequência** → Filtrar por entidade e chave e evitar invalidar visões não afetadas.
- **Conexão SSE indisponível em ambientes antigos** → Manter dados HTTP operantes e reconectar automaticamente.

## Migration Plan

Implantar endpoint SSE do Nave antes de ativar o assinante. Atualizar o Portal depois que o endpoint estiver disponível; remover o assinante em rollback sem afetar consultas REST.
