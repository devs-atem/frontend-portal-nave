# FEAT(NAVE-XXX): Vincular permissões RBAC aos módulos do Portal da Nave

## 📝 Resumo

Integrar o controle de acesso (RBAC) já existente no projeto às features do Portal
da Nave. Hoje o motor de autorização está implementado e testado, mas **nenhum
módulo o utiliza** — todas as telas ficam abertas a qualquer usuário autenticado.
Esta task vincula cada módulo/rota às permissões cadastradas no RBAC (grupo
`portal_nave`), passando a filtrar o menu e proteger as rotas.

## 🤔 Por que isso foi feito?

- **Problema:** as permissões do grupo `portal_nave` foram cadastradas no RBAC
  (ex.: `portal_nave:movements:read`), mas o frontend não as referencia em lugar
  nenhum. Resultado: o controle de acesso não tem efeito prático.
- **Contexto:** o template já traz `RouteGuard`, `useMenuItems`,
  `generatePermissionMatcher` e o campo `permission` no contrato de módulo —
  tudo pronto, só falta "ligar" nas features.

## 🎯 Escopo

### Em escopo
- Declarar `permission` nos itens de menu (`menu` / `menu.children`) de cada módulo.
- Envolver as rotas sensíveis em `<RouteGuard>` com o matcher correspondente.
- Garantir que `adminMode` continua com acesso total (comportamento nativo).

### Fora de escopo
- Cadastro/manutenção das permissões no RBAC (feito no backend/console).
- Alteração do motor de autorização (`RouteGuard`, `useMenuItems`, matchers).
- Permissões de ações dentro da página (botões, colunas) — avaliar em task futura.

## ✅ O que precisa ser feito

### 1. Pré-requisitos (backend/RBAC)
- [ ] Permissões do grupo `portal_nave` cadastradas no RBAC (ver `docs/rbac-portal-nave.md`).
- [ ] Permissões atribuídas aos perfis/usuários de teste.
- [ ] Confirmar que o token (`permissionSet.SYSTEM_MODULES`) retorna as chaves
      exatamente como no código (ex.: `portal_nave:movements:read`).

### 2. Vincular permissão no menu (`module.tsx`)
Para cada módulo, adicionar `permission` no item de menu (ou em cada child).

- [ ] `inicio` → `portal_nave:dashboard:read`
- [ ] `saldos` (children):
  - [ ] `/saldos/tanque` → `portal_nave:balances_tank:read`
  - [ ] `/saldos/lote` → `portal_nave:balances_batch:read`
  - [ ] `/saldos/posicao` → `portal_nave:balances_position:read`
  - [ ] `/saldos/estoque-online` → `portal_nave:balances_online:read`
- [ ] `veiculos` (children):
  - [ ] `/veiculos` → `portal_nave:vehicles:read`
  - [ ] `/veiculos/agendamentos` → `portal_nave:schedules:read`
  - [ ] `/veiculos/novo-agendamento` → `portal_nave:schedules:write`
- [ ] `fiscal` → `portal_nave:fiscal_nfe:read`
- [ ] `descargas` (children):
  - [ ] `/descargas/lote` → `portal_nave:unloads_batch:read`
  - [ ] `/descargas/periodo` → `portal_nave:unloads_period:read`
- [ ] `cargas` (children):
  - [ ] `/cargas/relatorio` → `portal_nave:loads_report:read`
  - [ ] `/cargas/volume` → `portal_nave:loads_volume:read`
  - [ ] `/cargas/movimentacao` → `portal_nave:loads_movement:read`
- [ ] `movimentos` → `portal_nave:movements:read`
- [ ] `qualidade` → `portal_nave:quality_density:read`
- [ ] `relatorios` → `portal_nave:reports:read`
- [ ] `admin` → `portal_nave:admin:read`
- [ ] `perfil` → _sem permissão_ (acessível a qualquer autenticado)

### 3. Proteger as rotas (`RouteGuard`)
Envolver cada `element` de rota com `<RouteGuard rules={generatePermissionMatcher(...)}>`.
Usar `requireWrite` nas rotas de escrita (ex.: novo agendamento).

- [ ] Aplicar o guard em todas as rotas listadas acima.
- [ ] Rotas de escrita usam `*` + `requireWrite` ou a chave `:write` direta.
- [ ] `/perfil` permanece sem guard.

### 4. Validação
- [ ] Usuário **admin** vê todos os menus e acessa todas as rotas.
- [ ] Usuário **sem** a permissão não vê o item no menu.
- [ ] Acesso por URL direta sem permissão redireciona para `/access-denied`.
- [ ] Grupo de menu sem nenhum filho visível some da sidebar.
- [ ] `yarn test` passando (inclui `useMenuItems.test.tsx`).
- [ ] `yarn lint` sem erros.

## 🔗 Referências de código

| Artefato | Caminho |
|---|---|
| Mapa de permissões | `docs/rbac-portal-nave.md` |
| Guard de rota | `src/core/router/RouteGuard.tsx` |
| Filtro de menu | `src/shared/hooks/useMenuItems.ts` |
| Matcher de permissão | `src/shared/utils/index.ts` (`generatePermissionMatcher`) |
| Contrato de módulo | `src/core/router/module.contract.ts` |
| Módulos | `src/features/*/module.tsx` |

## 🧪 Como testar

1. Subir o app: `corepack yarn dev` → http://localhost:5173
2. Com um usuário **não-admin** sem a permissão X: confirmar que o menu X não aparece
   e que acessar a rota direto cai em `/access-denied`.
3. Conceder a permissão X ao usuário e repetir: menu aparece e rota abre.
4. Com **admin**: tudo visível e acessível.

## ⚠️ Riscos / Atenção

- **Ordem de rollout:** ligar o RBAC **antes** das permissões estarem cadastradas
  e atribuídas pode "trancar" usuários (e devs) para fora das telas. Ativar só após
  o passo 1 concluído.
- **Strings idênticas:** as chaves no código devem bater exatamente com os IDs do
  RBAC. Qualquer divergência de nome (`movements` vs `movimentos`) quebra o match.
- **Feature flags:** `menu.flag` e `RouteGuard flag` são opcionais e independem do
  RBAC — não confundir com permissão.

## 📦 Entregáveis

- [ ] Todos os `module.tsx` com `permission` declarada.
- [ ] Todas as rotas sensíveis protegidas por `RouteGuard`.
- [ ] Testes e lint verdes.
- [ ] Doc `docs/rbac-portal-nave.md` revisada e alinhada com o que foi cadastrado.
