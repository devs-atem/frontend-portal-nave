## 1. Dev server com HTTPS

- [x] 1.1 Adicionar `@vitejs/plugin-basic-ssl` (versão fixa) às devDependencies e verificar que `yarn install` conclui sem erro
- [x] 1.2 Em `vite.config.ts`, incluir o plugin quando `VITE_HTTPS=true`; verificar com `yarn dev` que `https://localhost:5173` responde e que sem a flag responde `http://localhost:5173`

## 2. SPA de login hospedado

- [x] 2.1 Alterar `loginSpa.url.development` em `presets/atem.ts` (`https://authcog-dev.grupoatem.com.br/#/logout`) e `presets/ream.ts` (`https://auth-dev.ream.com.br/#/logout`); verificar com teste unitário de `buildLogoutUrl` por provider via `yarn test`
- [x] 2.2 Documentar `VITE_HTTPS` em `.env.example` e verificar que a variável aparece com explicação

## 3. Aliases locais

- [x] 3.1 Configurar `allowedHosts` e `open` por provider no `vite.config.ts` e a regra `localhost-dev.*` → `development` em `resolveEnv`; verificar com `curl --resolve`/Host header que o dev server responde 200 nos dois aliases e com `yarn test`/`yarn build`

## 4. Documentação e diagnóstico

- [x] 4.1 Corrigir URL do dev server em `README.md`, `scripts/setup.mjs` e `mise.toml` e remover a orientação de rodar o SPA de login localmente; verificar que `grep -rn "localhost:3000"` (exceto `openspec/` e `node_modules`) não retorna nada
- [x] 4.2 Fazer `scripts/doctor.mjs` avisar na inconsistência `VITE_HTTPS=true` sem HTTPS efetivo; verificar executando `yarn doctor` nos dois cenários
- [x] 4.3 Rodar `yarn lint`, `yarn build` e `yarn test` e verificar que passam
