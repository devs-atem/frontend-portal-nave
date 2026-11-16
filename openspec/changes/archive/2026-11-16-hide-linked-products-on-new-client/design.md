## Context

`ClientRegistrationPage.tsx` renderiza o formulário de criação e edição no mesmo modal, diferenciando os modos pela variável `editing`. O bloco "Produtos vinculados" tem um ramo `!editing` que mostra apenas um aviso. Os estados e o carregamento de produtos já são usados somente quando `editing` é verdadeiro. Ver proposal.md.

## Goals / Non-Goals

**Goals:**
- Não renderizar a seção no modo de criação.

**Non-Goals:**
- Alterar a edição, o modal de detalhe, o payload ou a API.
- Remover estados de produtos (continuam usados na edição).

## Decisions

- Envolver o bloco da seção em `{editing && (...)}` e remover o ramo `!editing` com o aviso, que se torna código morto. Alternativa: ocultar via CSS; descartada por manter o conteúdo no DOM sem necessidade.

## Risks / Trade-offs

- [Perda do aviso de que o vínculo só existe após o cadastro] → Aceito, por decisão do pedido.
