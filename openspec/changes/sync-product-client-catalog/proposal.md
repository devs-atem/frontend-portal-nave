# Proposal

## Why

O Portal Nave administra produtos e clientes, mas não recebe atualizações de produto-cliente originadas no Supervisorio. Atualizações em tempo real manterão a tela consistente com o estado sincronizado sem exigir recarga manual.

## What Changes

- Consumir o canal em tempo real do `mw-nave` para invalidar e atualizar listagens e detalhes de produtos, clientes e vínculos.
- Refletir alterações sincronizadas de nome/código compartilhado, vínculos e status independente do produto de cliente, permitindo consultar e alterar esse status no Portal.
- Preservar os campos e dados de cliente específicos do Nave.

## Capabilities

### New Capabilities

- `product-client-catalog-live-updates`: atualização automática do catálogo de produtos, clientes e vínculos após eventos sincronizados.

### Modified Capabilities

## Impact

- `src/features/products` e infraestrutura de HTTP/SSE do frontend.
- Endpoint SSE/evento de catálogo publicado pelo `mw-nave`.
- Consumidores existentes de produtos e clientes que compartilham os mesmos dados.
