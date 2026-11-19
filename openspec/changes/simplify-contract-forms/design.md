## Context

- `ContractFormPage` carrega depositantes, bases e produtos (por depositante ou catálogo completo) e monta `ContractForm` (`contractRules.ts`) com validação por `validateContractForm`.
- `RevisionEditor` mostra, por item: produto, pool (depende de base+produto), medida, código/descrição do cliente, tipos de movimento (com "Outro código"), tanques e demais quantidades. Hoje não existe serviço de arquivos/anexos no portal.
- O backend (change `simplify-contract-creation`) gera número e código, assume depositante/pool padrão e aceita contrato sem revisão.

## Goals / Non-Goals

**Goals:**
- Aplicar o comportamento pedido no HRZ-373 sem alterar telas de listagem/ações.
- Manter `RevisionEditor` reutilizável para "Editar rascunho" e "Nova revisão".

**Non-Goals:**
- CRUD de bases, integração SAP, alterar permissões.
- Remover os campos dos tipos de leitura (`ContractResponse`), que continuam exibindo o que o backend devolver.

## Decisions

1. **Remoção de campos por supressão na UI e no payload**, mantendo `ItemForm`/`ContractForm` enxutos: remover `ownerId`, `internalCode`, `contractNumber` do `ContractForm` de criação e `poolId`, `customerProduct*`, `allowedTankCodes` do `ItemForm`. `buildContractRequest`/`buildRevisionInput` enviam `allowedTankCodes: []` e `accountingMeasure: "GSV"`. Alternativa de manter campos ocultos no estado foi rejeitada para não carregar dado morto.
2. **Identificadores**: `ContractsService.nextIdentifiers()` chamado na abertura do modo `create`. Campos exibidos com `Input disabled`. Em `edit`, usa os valores do contrato.
3. **Revisão inicial**: nos modos `create`/`edit` o `RevisionEditor` roda com `itemsOnly` (sem vigência nem justificativa); a revisão enviada herda `effectiveFrom`/`effectiveTo` do contrato (`withContractRevisionDates`). `revision` só vai no corpo quando há itens. No modo `revision` o editor completo permanece. A submissão sem itens é tratada pelo 400 do backend.
4. **Produtos e itens**: sem depositante, usa sempre `reference.listProducts()`. A seção de itens (`ItemsPanel`) mostra uma linha por produto, na ordem da API, com checkbox; `ItemForm.included` define o que é validado e enviado. A linha só vira item no estado do formulário ao ser marcada ou editada; editar campo de linha desmarcada a marca. Produtos de itens existentes fora do catálogo atual ficam no fim da lista. O checkbox fica à direita da linha; não há badges de status. A busca por nome ou código é só de exibição.
5. **"Outro código"**: remover `allowCustom` do `CheckList` de tipos de movimento (único uso).
6. **Anexo**: novo `FilesService` (`POST /rest/files` multipart, `POST /rest/attachments`, URL de download) no IoC. Fluxo no submit: `POST /files` → `POST /contracts` → `POST /attachments`. Se o upload falhar antes de criar, nada é criado; se o `POST /attachments` falhar depois, avisar e navegar ao detalhe. Um arquivo, opcional (decisão assumida). Detalhe lista `attachments` com download autenticado.
7. **Tipos**: atualizar `contract.ts` (requests) após regenerar/ajustar contratos da API; adaptar testes `contractRules.test.ts` e `ContractsService.test.ts`.

## Risks / Trade-offs

- Depende do deploy do backend primeiro; sem ele o `POST` falha por campos ausentes. Ordem: backend → frontend.
- Número exibido pode divergir do final em criação concorrente; o detalhe mostra o definitivo.
- Contrato criado sem itens não pode ser submetido; o usuário pode incluir itens na criação ou editando o rascunho.
- Download de anexo exige token: usar o cliente HTTP autenticado (blob) em vez de link direto.
