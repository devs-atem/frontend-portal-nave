  # {{PRODUCT_NAME}}

> Baseado em [`template-frontend-atem`](https://github.com/devs-atem/template-frontend-atem) — base padrão para front-ends da Atem com design system, autenticação, roteamento modular e IoC prontos.

---

## Quick start

```bash
# 1. Instala runtimes (Node, yarn) via mise
mise install

# 2. Instala dependências
yarn install

# 3. Wizard interativo (nome, auth provider, flags…)
mise run setup

# 4. Sobe o dev server
mise run dev
```

Depois disso abre `http://localhost:5173`.

Se preferir sem mise: `yarn install && yarn setup && yarn dev`.

---

## Configuração para desenvolvimento local

### 1. Node.js gerenciado pelo mise

O projeto pina a versão de Node em `mise.toml`.

```bash
mise trust
mise install
```

Se o Node não aparecer no PATH do seu shell:

```bash
echo 'eval "$(mise activate bash)"' >> ~/.bashrc
source ~/.bashrc
```

Validar: `node -v` deve retornar `v24.21.0`.

### 2. Yarn 4 via Corepack

```bash
corepack enable
yarn --version   # 4.18.1
```

### 3. Acesso aos pacotes privados do GitHub

O projeto consome `@devs-atem/design-system` do GitHub Packages. Crie `~/.yarnrc.yml`:

```yaml
npmScopes:
  devs-atem:
    npmAlwaysAuth: true
    npmAuthToken: "SEU_GITHUB_TOKEN"
    npmRegistryServer: "https://npm.pkg.github.com"
```

```bash
chmod 600 ~/.yarnrc.yml
```

> O token precisa de scope `read:packages`. **Nunca** versione tokens no repositório.

Depois: `yarn install`.

---

## Stack

| Camada | Escolha |
|---|---|
| Build / dev server | Vite 8 |
| UI | React 19 + TypeScript 7 |
| Design system | [`@devs-atem/design-system`](https://github.com/devs-atem/atem-design-system) (zero MUI) |
| Ícones | lucide-react (via DS) |
| Roteamento | react-router-dom v7 (hash router) + descoberta automática de módulos |
| HTTP | axios + interceptor de refresh |
| IoC | [`iti`](https://github.com/molszanski/iti) — type-safe, services co-localizados por feature |
| Server state | @tanstack/react-query |
| Forms | react-hook-form + yup |
| Feature flags | @flagsmith/flagsmith (opcional) |
| Toasts | sonner |
| Observabilidade | @datadog/browser-rum (opcional) |

---

## Estrutura

```
src/
├── core/                    # Infra da aplicação
│   ├── app/                 # Composição de providers + entry point
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── auth/                # AuthContext, modelos, profile
│   ├── config/              # appConfig, featureFlags, auth presets
│   │   └── auth/presets/{atem,ream}.ts
│   ├── http/                # AxiosHttpService + IHttpService
│   ├── ioc/                 # Container iti + registry de services
│   │   ├── index.ts         # appContainer, registerModuleServices
│   │   └── registry.ts      # interface AppServices (aumentada por features)
│   ├── providers/           # Theme, Query, Flagsmith, Toast
│   ├── router/              # Descoberta de módulos, Shell, guards
│   │   ├── module.contract.ts     # interface Module
│   │   ├── modules.ts             # auto-discovery via import.meta.glob
│   │   ├── createAppRouter.tsx
│   │   ├── RouteGuard.tsx
│   │   └── builtin/{AccessDenied,NotFound}
│   └── services/            # Services do core (AuthService)
├── features/                # ← Features auto-descobertas
│   └── home/
│       ├── module.tsx       # manifesto: name, routes, menu, services?
│       └── pages/HomePage.tsx
├── shared/                  # Compartilhado entre features
│   ├── components/          # Layout/Shell, LoadingApp
│   ├── hooks/               # useIoC, useFeatureFlag, useMenuItems, useMediaQuery
│   └── utils/               # permissionAliases, appError, matchers
└── styles/globals.css
```

---

## Anatomia de um módulo

Cada feature mora em `src/features/<nome>/` e exporta um `Module` como default do arquivo `module.tsx`:

```tsx
// src/features/financeiro/module.tsx
import type { Module } from "@core/router/module.contract";
import { FinanceiroPage } from "./pages/FinanceiroPage";
import { FinanceiroService } from "./services/FinanceiroService";

// Aumenta o registry global de services via declaration merging.
// Depois disso, useIoC("financeiro") passa a ter autocomplete tipado.
declare module "@core/ioc/registry" {
  interface AppServices {
    financeiro: FinanceiroService;
  }
}

const financeiroModule: Module = {
  name: "financeiro",
  routes: [
    { path: "/financeiro", element: <FinanceiroPage /> },
  ],
  menu: {
    label: "Financeiro",
    path: "/financeiro",
    icon: "DollarSign",
    order: 20,
    permission: "portal_vendas:financeiro:read", // opcional
    flag: "sidebar_financeiro",                   // opcional
  },
  // Opcional — scaffolda só se o módulo tiver services próprios.
  services: (c) =>
    c.add({ financeiro: new FinanceiroService(c.get("http")) }),
};

export default financeiroModule;
```

Shape do contrato (ver `src/core/router/module.contract.ts`):

| Campo | Tipo | Obrigatório | O que faz |
|---|---|---|---|
| `name` | `string` | ✓ | Identificador curto. Usado em logs e como key. |
| `routes` | `RouteObject[]` | ✓ | Rotas registradas pelo módulo. Entrada direta no React Router. |
| `menu` | `MenuItem` | — | Entrada de menu. Omita pra features invisíveis. |
| `services` | `(c) => c` | — | Registra services da feature no container IoC. |

Descoberta é automática via `import.meta.glob("@features/*/module.tsx")` em `@core/router/modules`. Zero edição em registry central.

### IoC co-localizado

O container do `iti` nasce com `http` + `auth` (services do core) e depois **cada módulo adiciona os seus** via `module.services`. A tipagem é mantida por **declaration merging** da interface `AppServices` em `@core/ioc/registry`:

```ts
// src/core/ioc/registry.ts  (core)
export interface AppServices {
  http: IHttpService;
  auth: AuthService;
}

// src/features/financeiro/module.tsx  (feature, aumenta)
declare module "@core/ioc/registry" {
  interface AppServices {
    financeiro: FinanceiroService;
  }
}
```

Com isso `useIoC("financeiro")` tem autocomplete e type check em qualquer lugar do app, sem editar nenhum registry central.

Ordem de aplicação dos `services` segue a descoberta do `import.meta.glob` (alfabética do path). Services de feature **não devem** depender uns dos outros — só dos services do core (`http`, `auth`).

---

## Variáveis de ambiente

Veja `.env.example` para a lista completa. As obrigatórias:

| Variável | Valores | Descrição |
|---|---|---|
| `VITE_AUTH_PROVIDER` | `atem` \| `ream` | Qual preset de auth usar |
| `VITE_AUTH_RULES` | string | Identificador do produto (ex: `portal_vendas`) |
| `VITE_AUTH_ADMIN_ROLES` | `a,b,c` | Roles que ativam admin mode |
| `VITE_APP_NAME` | string | Nome do produto (aparece no title/logs) |

Opcionais: `VITE_APP_ENV`, `VITE_API_URL`, `VITE_AUTH_URL`, `VITE_FLAGSMITH_ENV_ID`, `VITE_FLAGSMITH_API_URL`, `VITE_DATADOG_*`.

---

## Autenticação

### Como funciona

1. Ao montar, `AuthProvider` lê o cookie `refreshToken`.
2. Chama `POST /auth/refresh` (URL vem do preset selecionado).
3. Recebe `AccessToken`, `RefreshToken`, `meta` com permissões.
4. Injeta o token em todas as requisições via interceptor do axios.
5. Agenda próximo refresh ~1h antes da expiração do access token.
6. Em erro de refresh ou cookie ausente → redireciona pro SPA de login.

### Troca de provedor

Edite `.env`:

```sh
VITE_AUTH_PROVIDER=ream
VITE_AUTH_RULES=canal_cliente_ream
```

Reinicie o dev server. **Zero mudança de código.**

### Adicionar um 3º provedor

1. Crie `src/core/config/auth/presets/meu-provedor.ts` seguindo o shape `AuthPreset`.
2. Registre em `src/core/config/auth/index.ts` no mapa `presets`.
3. Rode com `VITE_AUTH_PROVIDER=meu-provedor`.

---

## Permissões

```tsx
import { RouteGuard } from "@core/router/RouteGuard";
import { generatePermissionMatcher } from "@shared/utils";

{
  path: "/usuarios",
  element: (
    <RouteGuard
      flag="sidebar_users"
      rules={generatePermissionMatcher("portal_vendas:users:*")}
    >
      <UsersPage />
    </RouteGuard>
  ),
}
```

Admin bypass: qualquer role em `VITE_AUTH_ADMIN_ROLES` libera tudo automaticamente.

---

## Receitas

### Adicionar uma feature nova

```bash
# interativo
yarn generate module

# não-interativo (página única)
yarn generate module \
  --name=financeiro \
  --label="Financeiro" \
  --icon=DollarSign \
  --order=20

# com service IoC (scaffolda a classe + aumento de tipo + registro)
yarn generate module \
  --name=cadastros \
  --label="Cadastros" \
  --icon=Database \
  --service=CadastrosService

# com sub-rotas
yarn generate module \
  --name=operacional \
  --label="Operacional" \
  --icon=Truck \
  --children="pedidos:Pedidos:Package,entregas:Entregas:Truck"

# combinando tudo
yarn generate module \
  --name=financeiro \
  --label="Financeiro" \
  --icon=DollarSign \
  --order=20 \
  --service=FinanceiroService \
  --children="faturas:Faturas:FileText,pagamentos:Pagamentos:CreditCard"
```

O gerador cria:

- `src/features/<name>/module.tsx` com `name`, `routes`, `menu` e, se `--service` foi passado, `services` + `declare module`
- `src/features/<name>/pages/<Pascal>Page.tsx` (uma por sub-rota se `--children`)
- `src/features/<name>/services/<ClassName>.ts` se `--service`

Depois disso o item aparece sozinho na sidebar e `useIoC("<key>")` já tem autocomplete.

### Adicionar um service a uma feature existente

Via gerador (recomendado) regerando a feature com `--force --service=XxxService`, **ou** manualmente:

1. Crie `src/features/<name>/services/XxxService.ts`:
   ```ts
   export class XxxService {
     constructor(private readonly http: IHttpService) {}
     list() { return this.http.get<Xxx[]>("/xxx"); }
   }
   ```
2. No `module.tsx` da feature, aumente o registry e registre no container:
   ```tsx
   declare module "@core/ioc/registry" {
     interface AppServices {
       xxx: XxxService;
     }
   }

   const mod: Module = {
     // …
     services: (c) => c.add({ xxx: new XxxService(c.get("http")) }),
   };
   ```
3. Use com `const svc = useIoC("xxx")` em qualquer componente — autocomplete tipado funciona.

### Trocar o tema do Design System

Edite `src/core/providers/ThemeProvider.tsx`. O objeto `overrides` aceita `DeepPartial<ThemeTokens>` — mude cores, raios, tipografia sem recriar o tema inteiro.

### Features com muitas sub-rotas (10+)

O padrão do template é declarar sub-rotas inline no `module.tsx`. Pra features que crescerem muito, nada impede fazer um `import.meta.glob` **interno à feature** pra auto-descobrir filhos sem o template impor essa convenção em features pequenas:

```tsx
// src/features/featureGrande/module.tsx
const childModules = import.meta.glob<{ default: ChildModule }>(
  "./children/*.tsx",
  { eager: true },
);
const children = Object.values(childModules).map((m) => m.default);

const mod: Module = {
  name: "feature-grande",
  routes: children.map((c) => c.route),
  menu: { label: "...", icon: "...", children: children.map((c) => c.menu) },
};
```

Isso é uma convenção **opcional** da feature, não do template. Prefira a forma inline enquanto a feature tem até ~5 sub-rotas.

---

## Scripts disponíveis

Via mise (recomendado):

| Comando | O que faz |
|---|---|
| `mise install` | Instala Node e yarn nas versões pinadas |
| `mise run setup` | Wizard interativo (nome, auth, flags…) |
| `mise run doctor` | Valida ambiente (.env, deps, versões) |
| `mise run generate` | Scaffolda uma nova feature |
| `mise run dev` | Dev server em http://localhost:3000 |
| `mise run build` | Build de produção |
| `mise run preview` | Preview do build |
| `mise run lint` | ESLint |
| `mise run test` | Vitest |

Via yarn direto também funciona: `yarn dev`, `yarn build`, `yarn generate`, etc.

### Setup não-interativo (CI/automação)

```bash
node scripts/setup.mjs \
  --name=portal-financeiro \
  --product-name="Portal Financeiro" \
  --auth=atem \
  --rules=portal_financeiro \
  --admin-roles=admin,admin_portal_financeiro \
  --no-git-reset
```

---

## FAQ

**Posso usar pnpm/npm no lugar do yarn?**
Pode, mas o `mise.toml` pina yarn 4. Se trocar, ajuste lá também e remova o lockfile antigo.

**Como desabilito o Flagsmith?**
Deixe `VITE_FLAGSMITH_ENV_ID` vazio. O `FlagsmithProvider` detecta e pula o provider. `useFeatureFlag`/`useMenuItems` tratam o caso retornando "flag habilitada".

**O design system não tem o componente X que eu preciso.**
1. Prefira abrir issue/PR no [atem-design-system](https://github.com/devs-atem/atem-design-system).
2. Se precisar da coisa já, crie em `src/shared/components` usando primitivos (`div` + CSS Modules).
3. **Evite** adicionar MUI — o template foi feito pra viver sem.

**Sidebar está vazia após o setup. Por quê?**
Vem só com "Home". Rode `yarn generate module` pra criar o primeiro módulo de negócio.

**Como testo logout em dev?**
Em dev, `loginSpa.url.development` aponta pra `localhost:3000/#/logout`. Rode a SPA de login (`auth-front-atem` ou `front-auth-ream`) em paralelo pra ter o fluxo completo.

**`useIoC("x")` não tem autocomplete, por quê?**
Garanta que a feature tenha o bloco `declare module "@core/ioc/registry" { interface AppServices { x: XService } }` no `module.tsx`. Esse aumento de tipo é lido pelo TS globalmente, mas só se o `module.tsx` foi importado em algum lugar — a descoberta por `import.meta.glob` garante isso.

---

## Contribuindo com o template

Mudanças no template devem:
- Manter zero acoplamento a domínio específico (nada de "payback", "trading", etc.).
- Testar com `--auth=atem` E `--auth=ream` pra garantir que não quebrou um dos presets.
- Atualizar o README quando mudar comando/estrutura.

Rode `mise run doctor` antes de abrir PR.

