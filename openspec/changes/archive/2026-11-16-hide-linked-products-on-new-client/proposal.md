## Why

No modal de cadastro de novo cliente, a seção "Produtos vinculados" só exibe um aviso ("Disponível após o cadastro"), pois a API aceita o vínculo de produtos apenas na edição. A seção não oferece ação e ocupa espaço no formulário.

## What Changes

- Remover a seção "Produtos vinculados" do modal de formulário quando o cliente é novo (criação).
- Manter a seção inalterada na edição de cliente (busca, seleção e salvamento de vínculos).
- Manter inalterada a seção "Produtos vinculados" do modal de detalhe (somente leitura).

## Capabilities

### New Capabilities
- `client-registration-form`: comportamento do modal de formulário de cadastro/edição de clientes, começando pela visibilidade da seção de produtos vinculados.

### Modified Capabilities

## Impact

- Código: `src/features/client-registration/pages/ClientRegistrationPage.tsx` (JSX do modal de formulário).
- Sem mudança de API, dependências ou payload de criação.
