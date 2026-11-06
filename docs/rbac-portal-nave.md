# RBAC — Grupo de Permissões: Portal da Nave

Cadastro das permissões do produto **`portal_nave`** (Navemazônia — Portal da Nave) no RBAC.

- **Produto (rules):** `portal_nave`
- **Convenção de ID:** `portal_nave:<modulo>:<ação>`
- **Ações:** `read` (consultar) e `write` (cadastrar/editar).
- **Comparação:** exata. O sidebar e o `RouteGuard` só liberam o item se o ID cadastrado for idêntico ao da coluna "ID" (um `*` no código expande para `read`/`write`).
- **`write` não implica `read`:** quem recebe `write` deve receber também o `read` correspondente (ver perfis).
- **Admin:** a role em `VITE_AUTH_ADMIN_ROLES` (`admin`) ignora os filtros e tem acesso total — não precisa de permissão individual.
- **Grupos do menu** (Saldos, Veículos, Fiscal, Descargas, Cargas, Qualidade, Administrador) não têm permissão própria: aparecem se ao menos um filho estiver visível.
- **Código:** as permissões estão aplicadas no campo `menu.permission` e no `RouteGuard` de cada `src/features/<modulo>/module.tsx`.

---

## Permissões

| ID | Descrição |
|---|---|
| `portal_nave:dashboard:read` | Portal da Nave > Início -> Consultar |
| `portal_nave:products:read` | Portal da Nave > Produtos -> Consultar |
| `portal_nave:balances_tank:read` | Portal da Nave > Saldos > Saldos por tanque -> Consultar |
| `portal_nave:balances_batch:read` | Portal da Nave > Saldos > Saldos por lote -> Consultar |
| `portal_nave:balances_position:read` | Portal da Nave > Saldos > Posição dos tanques -> Consultar |
| `portal_nave:balances_online:read` | Portal da Nave > Saldos > Estoque online -> Consultar |
| `portal_nave:vehicles:read` | Portal da Nave > Veículos > Situação de veículos -> Consultar |
| `portal_nave:schedules:read` | Portal da Nave > Veículos > Agendamentos -> Consultar |
| `portal_nave:schedules:write` | Portal da Nave > Veículos > Novo agendamento -> Cadastrar/Editar |
| `portal_nave:fiscal_nfe:read` | Portal da Nave > Fiscal > Consulta de NF-e -> Consultar |
| `portal_nave:unloads_batch:read` | Portal da Nave > Descargas > Descargas por lote -> Consultar |
| `portal_nave:unloads_period:read` | Portal da Nave > Descargas > Descargas por período -> Consultar |
| `portal_nave:loads_report:read` | Portal da Nave > Cargas > Relatório de cargas -> Consultar |
| `portal_nave:loads_volume:read` | Portal da Nave > Cargas > Cargas por volume -> Consultar |
| `portal_nave:loads_movement:read` | Portal da Nave > Cargas > Movimentação de veículos -> Consultar |
| `portal_nave:movements:read` | Portal da Nave > Movimentos -> Consultar |
| `portal_nave:quality_density:read` | Portal da Nave > Qualidade > Densidades do tanque -> Consultar |
| `portal_nave:reports:read` | Portal da Nave > Relatórios -> Consultar |
| `portal_nave:contracts:read` | Portal da Nave > Contratos -> Consultar |
| `portal_nave:contracts:write` | Portal da Nave > Contratos -> Cadastrar/Editar |
| `portal_nave:client_registry:read` | Portal da Nave > Administrador > Cadastro de clientes -> Consultar |
| `portal_nave:admin:read` | Portal da Nave > Administrador > Administração -> Consultar |

> **Reservadas (ainda sem tela no front):** `portal_nave:quality_density:write` (edição de densidades) e `portal_nave:admin:write`. Podem ser cadastradas, mas não alteram nada no menu hoje.

> **Mudanças em relação à versão anterior:**
> - `portal_nave:admin-registry` → substituída por `portal_nave:client_registry:read` (ID realmente usado pelo código).
> - `portal_nave:balances:read` removida (o grupo "Saldos" não tem rota própria).
> - `portal_nave:products:read` adicionada (menu "Produtos").
> - `portal_nave:schedules:write` passa a proteger "Novo agendamento".

---

## Mapa menu → rota → permissão

Todos os itens abaixo já estão vinculados (menu + `RouteGuard`).

| Menu (sidebar) | Rota | Permissão | Arquivo |
|---|---|---|---|
| Início | `/inicio` | `portal_nave:dashboard:read` | `features/dashboard/module.tsx` |
| Saldos > Saldos por tanque | `/saldos/tanque` | `portal_nave:balances_tank:read` | `features/balances/module.tsx` |
| Saldos > Saldos por lote | `/saldos/lote` | `portal_nave:balances_batch:read` | `features/balances/module.tsx` |
| Saldos > Posição dos tanques | `/saldos/posicao` | `portal_nave:balances_position:read` | `features/balances/module.tsx` |
| Saldos > Estoque online | `/saldos/estoque-online` | `portal_nave:balances_online:read` | `features/balances/module.tsx` |
| Produtos | `/products` | `portal_nave:products:read` | `features/products/module.tsx` |
| Veículos > Situação de veículos | `/veiculos` | `portal_nave:vehicles:read` | `features/vehicles/module.tsx` |
| Veículos > Agendamentos | `/veiculos/agendamentos` | `portal_nave:schedules:read` | `features/vehicles/module.tsx` |
| Veículos > Novo agendamento | `/veiculos/novo-agendamento` | `portal_nave:schedules:write` | `features/vehicles/module.tsx` |
| Fiscal > Consulta de NF-e | `/fiscal/nfe` | `portal_nave:fiscal_nfe:read` | `features/fiscal/module.tsx` |
| Descargas > Descargas por lote | `/descargas/lote` | `portal_nave:unloads_batch:read` | `features/unloads/module.tsx` |
| Descargas > Descargas por período | `/descargas/periodo` | `portal_nave:unloads_period:read` | `features/unloads/module.tsx` |
| Cargas > Relatório de cargas | `/cargas/relatorio` | `portal_nave:loads_report:read` | `features/loads/module.tsx` |
| Cargas > Cargas por volume | `/cargas/volume` | `portal_nave:loads_volume:read` | `features/loads/module.tsx` |
| Cargas > Movimentação de veículos | `/cargas/movimentacao` | `portal_nave:loads_movement:read` | `features/loads/module.tsx` |
| Movimentos | `/movimentos` | `portal_nave:movements:read` | `features/movements/module.tsx` |
| Qualidade > Densidades do tanque | `/qualidade/densidades` | `portal_nave:quality_density:read` | `features/quality/module.tsx` |
| Relatórios | `/relatorios` | `portal_nave:reports:read` | `features/reports/module.tsx` |
| Contratos | `/contratos` | `portal_nave:contracts:read` (edição: `portal_nave:contracts:write`) | `features/contracts/module.tsx` |
| Administrador > Cadastro de clientes | `/registrations/clients` | `portal_nave:client_registry:read` | `features/administrador/module.tsx` |
| Administrador > Administração | `/admin` | `portal_nave:admin:read` | `features/administrador/module.tsx` |
| _(sem menu)_ Meu perfil | `/perfil` | _(sem permissão — todo usuário autenticado)_ | `features/profile/module.tsx` |

---

## Modelo de acesso (definido com o time de RBAC)

- **`portal_nave` é só o produto (rules)**: não é grupo e não tem permissão própria.
- **Dois grupos (roles)**, que carregam **apenas permissões de módulo** (não de centro):
  - `nave_cliente`
  - `nave_gestor_contratos`
- **`admin`** já existe no RBAC (acesso total via `VITE_AUTH_ADMIN_ROLES`).
- **Cada usuário é atrelado a UM grupo**: `nave_cliente` **ou** `nave_gestor_contratos`.
- **Centros** são atribuídos **individualmente por usuário** (cadastro individual), e não pelo grupo. No front chegam em `permissionSet.CENTERS`.

### `nave_cliente`
Consulta + criação de agendamentos.
```
portal_nave:dashboard:read
portal_nave:products:read
portal_nave:balances_tank:read
portal_nave:balances_batch:read
portal_nave:balances_position:read
portal_nave:balances_online:read
portal_nave:vehicles:read
portal_nave:schedules:read
portal_nave:schedules:write
portal_nave:fiscal_nfe:read
portal_nave:unloads_batch:read
portal_nave:unloads_period:read
portal_nave:loads_report:read
portal_nave:loads_volume:read
portal_nave:loads_movement:read
portal_nave:movements:read
portal_nave:quality_density:read
portal_nave:reports:read
```
> `schedules:write` está incluída por suposição (antes havia "Consulta" e "Agendador"). Confirmar com o PO; se o cliente só consulta, remover.

### `nave_gestor_contratos`
Módulo de Contratos.
```
portal_nave:contracts:read
portal_nave:contracts:write
```
> Se o gestor precisar de outras telas (ex.: Início), acrescentar as permissões aqui.

### `admin`
Acesso total, sem permissões individuais.
