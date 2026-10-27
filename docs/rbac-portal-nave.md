# RBAC — Grupo de Permissões: Portal da Nave

Cadastro das permissões do produto **`portal_nave`** (Navemazônia — Portal da Nave) no RBAC.

- **Produto (rules):** `portal_nave`
- **Convenção de ID:** `portal_nave:<modulo>:<ação>`
- **Ações:** `read` (consultar) e `write` (cadastrar/editar). Telas de ação única (ex.: cadastros mestres) usam um ID sem sufixo de ação.
- **Observação:** o `admin` (role em `VITE_AUTH_ADMIN_ROLES`) ignora os filtros e tem acesso total — não precisa de permissão individual.

---

## Permissões

| ID | Descrição |
|---|---|
| `portal_nave:admin-registry` | Portal da Nave -> Administração (Cadastros / Dados Mestres) |
| `portal_nave:dashboard:read` | Portal da Nave > Início -> Consultar |
| `portal_nave:balances:read` | Portal da Nave > Saldos -> Consultar |
| `portal_nave:balances_tank:read` | Portal da Nave > Saldos > Saldos por tanque -> Consultar |
| `portal_nave:balances_batch:read` | Portal da Nave > Saldos > Saldos por lote -> Consultar |
| `portal_nave:balances_position:read` | Portal da Nave > Saldos > Posição dos tanques -> Consultar |
| `portal_nave:balances_online:read` | Portal da Nave > Saldos > Estoque online -> Consultar |
| `portal_nave:vehicles:read` | Portal da Nave > Veículos > Situação de veículos -> Consultar |
| `portal_nave:schedules:read` | Portal da Nave > Veículos > Agendamentos -> Consultar |
| `portal_nave:schedules:write` | Portal da Nave > Veículos > Agendamentos -> Cadastrar/Editar |
| `portal_nave:fiscal_nfe:read` | Portal da Nave > Fiscal > Consulta de NF-e -> Consultar |
| `portal_nave:unloads_batch:read` | Portal da Nave > Descargas > Descargas por lote -> Consultar |
| `portal_nave:unloads_period:read` | Portal da Nave > Descargas > Descargas por período -> Consultar |
| `portal_nave:loads_report:read` | Portal da Nave > Cargas > Relatório de cargas -> Consultar |
| `portal_nave:loads_volume:read` | Portal da Nave > Cargas > Cargas por volume -> Consultar |
| `portal_nave:loads_movement:read` | Portal da Nave > Cargas > Movimentação de veículos -> Consultar |
| `portal_nave:movements:read` | Portal da Nave > Movimentos -> Consultar |
| `portal_nave:quality_density:read` | Portal da Nave > Qualidade > Densidades do tanque -> Consultar |
| `portal_nave:quality_density:write` | Portal da Nave > Qualidade > Densidades do tanque -> Cadastrar/Editar |
| `portal_nave:reports:read` | Portal da Nave > Relatórios -> Consultar |
| `portal_nave:admin:read` | Portal da Nave > Administração -> Consultar |
| `portal_nave:admin:write` | Portal da Nave > Administração -> Cadastrar/Editar |

---

## Mapa módulo → rota → permissão

Referência para amarrar cada rota ao `RouteGuard` e cada item de menu ao campo `permission`.

| Módulo | Rota | Permissão sugerida |
|---|---|---|
| Início | `/inicio` | `portal_nave:dashboard:read` |
| Saldos — Saldos por tanque | `/saldos/tanque` | `portal_nave:balances_tank:read` |
| Saldos — Saldos por lote | `/saldos/lote` | `portal_nave:balances_batch:read` |
| Saldos — Posição dos tanques | `/saldos/posicao` | `portal_nave:balances_position:read` |
| Saldos — Estoque online | `/saldos/estoque-online` | `portal_nave:balances_online:read` |
| Veículos — Situação de veículos | `/veiculos` | `portal_nave:vehicles:read` |
| Veículos — Agendamentos | `/veiculos/agendamentos` | `portal_nave:schedules:read` |
| Veículos — Novo agendamento | `/veiculos/novo-agendamento` | `portal_nave:schedules:write` |
| Fiscal — Consulta de NF-e | `/fiscal/nfe` | `portal_nave:fiscal_nfe:read` |
| Descargas — Por lote | `/descargas/lote` | `portal_nave:unloads_batch:read` |
| Descargas — Por período | `/descargas/periodo` | `portal_nave:unloads_period:read` |
| Cargas — Relatório de cargas | `/cargas/relatorio` | `portal_nave:loads_report:read` |
| Cargas — Cargas por volume | `/cargas/volume` | `portal_nave:loads_volume:read` |
| Cargas — Movimentação de veículos | `/cargas/movimentacao` | `portal_nave:loads_movement:read` |
| Movimentos | `/movimentos` | `portal_nave:movements:read` |
| Qualidade — Densidades do tanque | `/qualidade/densidades` | `portal_nave:quality_density:read` |
| Relatórios | `/relatorios` | `portal_nave:reports:read` |
| Administração | `/admin` | `portal_nave:admin:read` |
| Meu perfil | `/perfil` | _(sem permissão — todo usuário autenticado)_ |

---

## Perfis sugeridos (grupos de atribuição)

Agrupamentos típicos para facilitar a atribuição no RBAC. Ajuste conforme a política de acesso.

### Cliente — Consulta
Acesso somente leitura ao que é do próprio cliente.
```
portal_nave:dashboard:read
portal_nave:balances_tank:read
portal_nave:balances_batch:read
portal_nave:balances_position:read
portal_nave:balances_online:read
portal_nave:vehicles:read
portal_nave:schedules:read
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

### Cliente — Agendador
Consulta + criação de agendamentos.
```
(todas as permissões de "Cliente — Consulta")
portal_nave:schedules:write
```

### Operador Navemazônia
Consulta + operações de qualidade.
```
(todas as permissões de "Cliente — Consulta")
portal_nave:schedules:write
portal_nave:quality_density:write
```

### Administrador
Acesso total (concedido via role admin em `VITE_AUTH_ADMIN_ROLES`; não exige permissões individuais). Caso seja atribuído por permissões:
```
portal_nave:admin:read
portal_nave:admin:write
portal_nave:admin-registry
(todas as demais permissões do produto)
```
