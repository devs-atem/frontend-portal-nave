## Why

O setup (`scripts/setup.mjs`) grava `VITE_HTTPS=true` no `.env`, mas nada no projeto consome essa variável: o `vite.config.ts` sobe sempre em `http://localhost:5173`. Além disso, README/`setup.mjs`/`mise` documentam `http://localhost:3000`, e os presets de auth apontam, em `development`, o SPA de login para `http://localhost:3000/#/logout`. Porém o SPA de login é hospedado (`authcog-dev.grupoatem.com.br` e `auth-dev.ream.com.br`), então o redirect de logout em dev vai para um localhost inexistente, sem SSL.

## What Changes

- Fazer o dev server do Vite respeitar `VITE_HTTPS=true`, servindo em `https://localhost:5173` com certificado local.
- Apontar `loginSpa.url.development` dos presets para o SPA de login hospedado:
  - `atem`: `https://authcog-dev.grupoatem.com.br/#/logout`
  - `ream`: `https://auth-dev.ream.com.br/#/logout`
- Alinhar a documentação (README, mensagem final do `setup.mjs`, descrição da task `mise run dev`) com a URL real do dev server e remover a menção a rodar o SPA de login localmente.
- Fazer `scripts/doctor.mjs` avisar quando `VITE_HTTPS=true` mas o HTTPS não está efetivo.

## Capabilities

### New Capabilities
- `local-dev-server`: comportamento do servidor de desenvolvimento local (protocolo/porta/URL de origem) e como essa origem é usada no redirect de logout/login em dev.

### Modified Capabilities
<!-- nenhuma: não existem specs em openspec/specs ainda -->

## Impact

- `vite.config.ts` (plugin de SSL + leitura de `VITE_HTTPS`), `package.json` (nova devDependency, versão fixa).
- `src/core/config/auth/presets/atem.ts` e `ream.ts` (URL de dev do SPA de login).
- `.env.example`, `README.md`, `scripts/setup.mjs`, `scripts/doctor.mjs`, `mise.toml`.
- Sem impacto em homologação/produção.
