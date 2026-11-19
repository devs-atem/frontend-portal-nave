## Why

Para validar o fluxo de contratos (HRZ-373), o formulário de novo contrato e o formulário de itens precisam ser simplificados: campos que o negócio não usa agora saem, outros viram fixos ou automáticos e o contrato passa a aceitar um anexo. Depende da change `simplify-contract-creation` do `mw-nave`.

## What Changes

**Formulário de contrato (`ContractFormPage`)**
- **Código interno**: exibido desativado, com o valor padrão devolvido pelo backend.
- **Número do contrato**: carregado do backend ao abrir a página (`GET /contracts/next-identifiers`) e exibido desativado. O número definitivo é o da resposta do `POST`.
- **Depositante**: campo removido; `ownerId` deixa de ser enviado.
- **Base**: continua listando `GET /operational-catalog/bases/all` (cadastro já existente).
- **Seção "Revisão inicial"**: removida a vigência e a justificativa da revisão; o formulário de itens continua na criação e na edição, e a revisão acompanha a vigência do contrato.
- **Anexo de contrato**: novo campo de upload (envio em `POST /files`, confirmação em `POST /attachments` com `entityType = CONTRACT`, após salvar o rascunho). Lista e download dos anexos na página de detalhe.

**Formulário de itens (`RevisionEditor`)**
- Remover: **Pool**, **Código do produto do cliente**, **Descrição do produto do cliente**, **"Outro código"** (campo de código personalizado em tipos de movimento) e **Tanques permitidos**.
- **Medida contábil**: fixa em `GSV`, desativada.
- Itens passam a ser enviados sem `poolId`, sem `customerProduct*` e com `allowedTankCodes: []`.

**Efeitos laterais**
- Como o depositante sai, a lista de produtos do item passa a vir do catálogo completo (`reference.listProducts()`).
- A chave de duplicidade do item passa de `produto+pool` para `produto`.
- O formulário de itens fica na criação, em "Editar rascunho" e em "Nova revisão"; sem itens, o contrato é criado sem `revision`.

**BREAKING**: nenhum para usuários; o tipo `CreateContractRequest` do portal muda (campos removidos/opcionais).

## Capabilities

### New Capabilities
- `contract-forms`: comportamento dos formulários de contrato e de itens do portal.

### Modified Capabilities
<!-- Nenhuma: o spec existente é de cadastro de cliente. -->

## Impact

- `src/features/contracts/pages/ContractFormPage.tsx`, `ContractDetailPage.tsx`
- `src/features/contracts/components/RevisionEditor.tsx`
- `src/features/contracts/services/contractRules.ts` (+ testes), `contract.ts`, `ContractsService.ts` (+ testes), `ReferenceService.ts`
- Novo serviço de arquivos/anexos (`FilesService`) registrado no IoC (`src/core/ioc`)
- Depende do `mw-nave`: `GET /contracts/next-identifiers`, `POST /contracts` sem `ownerId`/`poolId`/`revision`, `attachments` em `GET /contracts/:id`.
