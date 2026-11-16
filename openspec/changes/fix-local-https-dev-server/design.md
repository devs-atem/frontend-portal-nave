## Context

Hoje `vite.config.ts` fixa `port: 5173`, `strictPort: true`, sem `https`. `VITE_HTTPS` só é escrito pelo `setup.mjs`. A porta 3000 que aparece em README/`setup.mjs`/`mise.toml` e em `loginSpa.url.development` é resíduo do template: o SPA de login é hospedado (`authcog-dev.grupoatem.com.br`, `auth-dev.ream.com.br`) e não roda localmente. `buildLogoutUrl()` envia `window.location.origin` ao SPA de login, então o protocolo/porta do dev server afetam o retorno do login.

## Goals / Non-Goals

**Goals:**
- `VITE_HTTPS=true` realmente habilita HTTPS no dev.
- Documentação e URLs coerentes.
- Logout em dev apontando para o SPA de login hospedado.

**Non-Goals:**
- Mudar a porta padrão do app ou o fluxo de auth em homologação/produção.
- Tornar a URL do SPA de login configurável por env var.
- Gerenciar CA local do sistema (mkcert) automaticamente.

## Decisions

- **`@vitejs/plugin-basic-ssl`, adicionado só quando `VITE_HTTPS=true`.** Zero setup (certificado autoassinado), oficial do Vite. Alternativa: `mkcert` (certificado confiável, mas exige instalação por dev) — pode ser adotado depois via `server.https` com cert/key.
- **Manter porta 5173 e corrigir a documentação** (README/setup/mise) em vez de mover o app para 3000, que era só um resíduo do template.
- **`development` dos presets aponta para o mesmo host de homologação** (`authcog-dev.grupoatem.com.br` / `auth-dev.ream.com.br`). Simples e sem nova env var. Alternativa: override `VITE_LOGIN_SPA_URL` — descartada por não haver caso de uso com SPA local.
- **Doctor**: ler `.env` e comparar com `vite.config.ts` de forma simples (presença do plugin/uso de `VITE_HTTPS`) para emitir aviso, sem iniciar o servidor.

- **Aliases `localhost-dev.*` via `/etc/hosts` + `server.allowedHosts` + `open` por provider.** Os SPAs/cookies hospedados operam em subdomínios dos domínios Atem/Ream; o alias torna a origem do app compatível. `resolveEnv` ganha regra explícita antes de `/-dev\./` (que classificaria o alias como homologação). `localhost` segue válido.

## Risks / Trade-offs

- [Alias ausente em `/etc/hosts` → navegador não resolve o host aberto] → documentar no README e `.env.example`.

- [Navegador alerta certificado autoassinado] → documentar como aceitar o aviso ou migrar para mkcert.
- [SPA de login hospedado precisa aceitar `https://localhost:5173` como URL de retorno] → confirmado pelo time como aceito; se mudar, ajuste é no lado do SPA de login (dependência externa).
- [Nova dependência] → versão fixa em `devDependencies`.
