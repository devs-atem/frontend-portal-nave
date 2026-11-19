## 1. Serviços e tipos

- [x] 1.1 Atualizar `contract.ts`: `CreateContractRequest`/itens sem `internalCode`, `contractNumber`, `ownerId`, `poolId`, `customerProduct*`; `revision` opcional; tipo de anexo em `ContractResponse`; verificar com `yarn tsc`
- [x] 1.2 `ContractsService.nextIdentifiers()`; verificar com teste em `ContractsService.test.ts`
- [x] 1.3 Criar `FilesService` (upload `POST /files`, confirmação `POST /attachments`, download) e registrá-lo no IoC; verificar com teste unitário

## 2. Regras do formulário

- [x] 2.1 `contractRules.ts`: remover os campos do `ContractForm`/`ItemForm`, fixar `GSV` e `allowedTankCodes: []`, remover validações de pool/identificadores e trocar a chave de duplicidade para produto; verificar com `contractRules.test.ts` atualizado

## 3. Telas

- [x] 3.1 `ContractFormPage`: identificadores desativados vindos do backend, remover depositante e a vigência/justificativa da "Revisão inicial" (itens permanecem, vigência herdada do contrato), produtos do catálogo completo; verificar manualmente os cenários do spec
- [x] 3.2 Campo de anexo e fluxo upload → criação → confirmação, com tratamento de falha parcial; verificar com os cenários de anexo
- [x] 3.3 `RevisionEditor`: remover Pool, código/descrição do cliente, "Outro código" e Tanques; Medida contábil fixa `GSV` desativada; verificar com os cenários do spec
- [x] 3.4 `ContractDetailPage`: listar anexos com download e tratar erro de submissão sem itens; verificar manualmente
- [x] 3.5 Refazer a seção de itens (`ItemsPanel`): lista de produtos com checkbox, busca e detalhe em abas; enviar só os marcados; verificar com `ItemsPanel.test.tsx` e `contractRules.test.ts`
- [x] 3.6 Modal de confirmação do rascunho (`SaveDraftModal`: altura total, 60% da largura, blur, 20% | 80%); verificar com `SaveDraftModal.test.tsx`

## 4. Verificação final

- [x] 4.1 Rodar `yarn lint`, `yarn test` e `yarn build` e verificar que passam
- [ ] 4.2 Teste manual end-to-end com o `mw-nave` local: criar contrato com e sem anexo, editar rascunho com itens, submeter
- [x] 4.3 Rodar `openspec validate simplify-contract-forms --strict` e verificar que não há erros
