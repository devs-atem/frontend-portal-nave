## Purpose

Define o comportamento dos formulários de novo contrato e de itens de revisão do portal.

## ADDED Requirements

### Requirement: Itens por produto com seleção

O formulário de itens SHALL listar todos os produtos do catálogo, na ordem devolvida pela API, cada um com um checkbox. Somente os itens marcados MUST ser validados e enviados à API. A lista SHALL oferecer um campo de busca por nome ou código do produto.

#### Scenario: Lista inicial
- **WHEN** o usuário abre o formulário de contrato
- **THEN** cada produto do catálogo aparece como uma linha desmarcada, na ordem da API

#### Scenario: Marcar e desmarcar
- **WHEN** o usuário marca uma linha e depois a desmarca
- **THEN** o item deixa de ser enviado e os valores digitados são mantidos caso seja marcado de novo

#### Scenario: Edição marca a linha
- **WHEN** o usuário digita em um campo de uma linha desmarcada
- **THEN** a linha passa a ficar marcada

#### Scenario: Envio apenas dos marcados
- **WHEN** o usuário salva com itens marcados e desmarcados
- **THEN** o corpo da requisição contém só os marcados, e itens desmarcados não geram erro de validação

#### Scenario: Busca
- **WHEN** o usuário digita no campo de busca
- **THEN** a lista mostra apenas os produtos cujo nome ou código contém o texto

#### Scenario: Nova revisão sem itens marcados
- **WHEN** o usuário tenta criar uma nova revisão sem nenhum item marcado
- **THEN** o formulário bloqueia o envio pedindo ao menos um item marcado

### Requirement: Identificadores automáticos e bloqueados

O formulário de novo contrato SHALL exibir "Código interno" e "Número do contrato" desativados, preenchidos com os valores obtidos do backend ao abrir a página, e MUST NOT enviá-los na criação.

#### Scenario: Abertura do formulário
- **WHEN** o usuário abre "Novo contrato"
- **THEN** os dois campos aparecem desativados com os valores devolvidos pelo backend

#### Scenario: Falha ao carregar os identificadores
- **WHEN** a consulta falha
- **THEN** o formulário exibe o erro, mantém os campos vazios e desativados e impede o salvamento

#### Scenario: Contrato criado
- **WHEN** o rascunho é salvo
- **THEN** o usuário é levado ao detalhe, que exibe o número atribuído pelo backend

### Requirement: Campos removidos do formulário de contrato

O formulário de novo contrato MUST NOT exibir o campo "Depositante" nem os campos de vigência e justificativa da "Revisão inicial", e MUST NOT enviar `ownerId`. A revisão SHALL acompanhar a vigência do contrato, e `revision` só é enviado quando há itens.

#### Scenario: Novo contrato
- **WHEN** o usuário abre "Novo contrato"
- **THEN** não há campo de depositante, vigência da revisão nem justificativa, e o formulário de itens está disponível

#### Scenario: Vigência da revisão
- **WHEN** o usuário salva o contrato com itens
- **THEN** a revisão enviada começa e termina nas datas de vigência do contrato

#### Scenario: Contrato sem itens
- **WHEN** o usuário salva sem adicionar itens
- **THEN** o contrato é criado sem `revision`

#### Scenario: Edição de rascunho e nova revisão
- **WHEN** o usuário abre "Editar rascunho" ou "Nova revisão"
- **THEN** o formulário de itens continua disponível; na nova revisão, vigência e justificativa continuam exibidas

### Requirement: Base do cadastro

O campo "Base" SHALL listar as bases ativas do cadastro operacional.

#### Scenario: Bases disponíveis
- **WHEN** o formulário carrega
- **THEN** o select lista as bases de `GET /operational-catalog/bases/all`

#### Scenario: Nenhuma base ou erro
- **WHEN** a lista está vazia ou a chamada falha
- **THEN** o formulário exibe "Nenhuma base disponível" ou a mensagem de erro

### Requirement: Anexo de contrato

O formulário de contrato SHALL oferecer um campo para anexar um arquivo ao contrato. O arquivo é enviado ao salvar o rascunho e vinculado ao contrato criado.

#### Scenario: Contrato com anexo
- **WHEN** o usuário seleciona um arquivo e salva o rascunho
- **THEN** o portal envia o arquivo, cria o contrato e confirma o anexo como `CONTRACT` do contrato criado

#### Scenario: Contrato sem anexo
- **WHEN** o usuário salva sem selecionar arquivo
- **THEN** o contrato é criado normalmente

#### Scenario: Falha ao anexar
- **WHEN** o contrato é criado e o anexo falha
- **THEN** o portal informa que o contrato foi criado sem anexo e leva o usuário ao detalhe

#### Scenario: Arquivo rejeitado
- **WHEN** o arquivo excede 20 MB ou tem tipo não permitido
- **THEN** o formulário exibe o erro devolvido e não cria o contrato

#### Scenario: Detalhe do contrato
- **WHEN** o contrato possui anexos
- **THEN** o detalhe lista cada anexo com link de download

### Requirement: Campos removidos do formulário de itens

O formulário de itens MUST NOT exibir Pool, Código do produto do cliente, Descrição do produto do cliente, o campo "Outro código" nem Tanques permitidos, e MUST NOT enviar `poolId` nem `customerProduct*`. O envio SHALL incluir `allowedTankCodes: []`.

#### Scenario: Item novo
- **WHEN** o usuário adiciona um item
- **THEN** nenhum dos campos removidos aparece

#### Scenario: Envio
- **WHEN** a revisão é salva
- **THEN** o corpo dos itens não contém `poolId` nem `customerProduct*` e `allowedTankCodes` é `[]`

#### Scenario: Produto repetido
- **WHEN** o catálogo tem um produto
- **THEN** ele aparece em uma única linha, e não é possível incluí-lo duas vezes

### Requirement: Medida contábil fixa

O formulário de itens SHALL exibir "Medida contábil" desativada com o valor `GSV` e enviar `accountingMeasure = "GSV"`.

#### Scenario: Item novo
- **WHEN** o usuário adiciona um item
- **THEN** a medida contábil é `GSV` e não pode ser alterada

#### Scenario: Item de revisão existente com outra medida
- **WHEN** o usuário cria uma revisão a partir de itens com outra medida
- **THEN** a medida exibida e enviada é `GSV`

### Requirement: Confirmação antes de salvar o rascunho

Ao criar ou editar um rascunho, o portal SHALL exibir um modal de confirmação antes de enviar à API. O modal MUST ocupar a altura total da tela e 60% da largura, com o fundo desfocado, dividido em uma coluna menor (20%, tom mais escuro, com informações curtas) e uma maior (80%, em branco, com todos os detalhes do contrato e dos itens marcados). A nova revisão MUST NOT exigir esse modal.

#### Scenario: Confirmar
- **WHEN** o formulário é válido e o usuário clica em "Criar rascunho" ou "Salvar rascunho"
- **THEN** o modal exibe dados gerais (código interno, número, base, vigência, anexo) e os itens marcados, e o envio só ocorre ao confirmar

#### Scenario: Voltar
- **WHEN** o usuário clica em "Voltar" ou fecha o modal
- **THEN** nada é enviado e o formulário permanece como estava

#### Scenario: Falha no envio
- **WHEN** o envio falha após a confirmação
- **THEN** o modal permanece aberto exibindo o erro

#### Scenario: Formulário inválido
- **WHEN** o formulário tem erros de validação
- **THEN** o modal não abre e os campos inválidos são destacados
