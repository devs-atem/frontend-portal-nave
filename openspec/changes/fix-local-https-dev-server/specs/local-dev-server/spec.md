## Purpose

Define como o servidor de desenvolvimento local expõe a aplicação (protocolo, porta e origem) e como essa origem é usada nos redirects de login/logout, para que o ambiente local seja previsível e documentado.

## ADDED Requirements

### Requirement: Dev server respeita a flag de HTTPS
O dev server SHALL servir a aplicação via HTTPS em `https://localhost:<porta>` quando `VITE_HTTPS=true`, e via HTTP caso contrário.

#### Scenario: HTTPS habilitado
- **WHEN** `VITE_HTTPS=true` e o dev server é iniciado
- **THEN** a aplicação responde em `https://localhost:5173` com certificado local

#### Scenario: HTTPS desabilitado
- **WHEN** `VITE_HTTPS` está ausente ou diferente de `true`
- **THEN** a aplicação responde em `http://localhost:5173`

### Requirement: Porta do dev server é única e documentada
A porta do dev server SHALL ser a mesma em configuração, README, mensagens do setup e descrição das tasks.

#### Scenario: Documentação consistente
- **WHEN** o desenvolvedor lê o README, a saída do `setup` ou a descrição de `mise run dev`
- **THEN** a URL indicada é a mesma em que o dev server realmente sobe

### Requirement: Logout em dev usa o SPA de login hospedado
Em desenvolvimento, o redirect de logout SHALL apontar para o SPA de login hospedado do provider de auth configurado, enviando a origem atual do dev server e as `rules` como parâmetros; MUST NOT apontar para `localhost`.

#### Scenario: Provider Atem
- **WHEN** o provider é `atem`, o ambiente é `development` e o usuário faz logout
- **THEN** o navegador é redirecionado para `https://authcog-dev.grupoatem.com.br/#/logout?url=<origem atual>&rules=<rules>`

#### Scenario: Provider Ream
- **WHEN** o provider é `ream`, o ambiente é `development` e o usuário faz logout
- **THEN** o navegador é redirecionado para `https://auth-dev.ream.com.br/#/logout?url=<origem atual>&rules=<rules>`

#### Scenario: Origem de retorno com HTTPS
- **WHEN** o dev server roda com `VITE_HTTPS=true`
- **THEN** o parâmetro `url` enviado é `https://localhost:5173`

### Requirement: Aliases locais por provider
O dev server SHALL aceitar requisições nos hosts `localhost-dev.grupoatem.com.br` e `localhost-dev.ream.com.br`, abrir o navegador no alias correspondente ao provider configurado, e a aplicação SHALL tratar esses hosts como ambiente `development`.

#### Scenario: Acesso pelo alias
- **WHEN** o alias aponta para 127.0.0.1 e o usuário acessa `https://localhost-dev.grupoatem.com.br:5173`
- **THEN** a aplicação responde normalmente, sem bloqueio de host

#### Scenario: Ambiente derivado do alias
- **WHEN** `VITE_APP_ENV` não está definido e o hostname é `localhost-dev.ream.com.br`
- **THEN** o ambiente resolvido é `development`

#### Scenario: Navegador aberto no alias
- **WHEN** o provider é `ream` e o dev server inicia
- **THEN** o navegador abre `https://localhost-dev.ream.com.br:5173` (ou `http` se HTTPS estiver desligado)

### Requirement: Diagnóstico de configuração
O comando `doctor` SHALL avisar quando `VITE_HTTPS=true` mas a configuração do dev server não habilita HTTPS.

#### Scenario: Inconsistência detectada
- **WHEN** `VITE_HTTPS=true` e o HTTPS não está habilitado na configuração
- **THEN** o `doctor` reporta um aviso descrevendo a inconsistência
