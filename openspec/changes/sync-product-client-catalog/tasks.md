# Tasks

## 1. Estado e atualização de produto-cliente

- [x] 1.1 Atualizar contratos/serviços para incluir status do vínculo e mutação de status por BP.
- [x] 1.2 Atualizar painéis de produto/cliente para exibir e alterar status independente do produto genérico.
- [x] 1.3 Adicionar cliente SSE e atualizar listagem/detalhe para eventos de catálogo.
- [x] 1.4 Implementar reconexão e cleanup da conexão; consultas continuam usando HTTP.

## 2. Validação integrada

- [x] 2.1a Adicionar testes do cliente SSE (`ApiProductsDataSource.stream.test.ts`): parsing de frames, frame sem `data`, JSON inválido e payload que não é objeto (descartados com `warn`), frame quebrado entre chunks, `\r\n`, backoff crescente com teto de 15s, reconexão após desconexão e `abort` sem reconectar.
- [x] 2.1b Rejeitar o detalhe quando um vínculo vier sem `linkIsActive` em vez de presumir ativo.
- [ ] 2.1 Adicionar testes da invalidação seletiva de queries; verificar que eventos repetidos não alteram formulário local.
- [ ] 2.2 Validar o ciclo completo com eventos originados no Nave e no Supervisorio, incluindo status inativo e BP; registrar comportamento observado.
