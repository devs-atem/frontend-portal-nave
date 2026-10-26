# Requirements — Portal do Cliente de Armazenagem (Navemazônia)

## Visão geral

Estruturar o front-end do **Portal do Cliente de Armazenagem** da Navemazônia a
partir do protótipo (`Portal NavemazoniaPrototipo.html`), dividido em módulos
auto-descobertos, seguindo o padrão já estabelecido no `template-frontend-atem`:

- Contrato de módulo (`Module`) com `routes`, `menu` e `services` opcionais.
- Descoberta automática via `import.meta.glob("src/features/*/module.tsx")`.
- IoC co-localizado (`iti`) com `declaration merging` da interface `AppServices`.
- Design system `@devs-atem/design-system` (zero MUI).
- Hash router (`createHashRouter`), Shell com `Sidebar` do DS.

O protótipo é uma SPA de demonstração com dados mockados. Esta entrega replica a
**arquitetura e as telas** com dados mockados servidos por um service registrado
no IoC, pronto para depois trocar o mock por chamadas HTTP reais.

## Escopo dos módulos (derivado do menu do protótipo)

| Feature | Menu | Rotas | Ícone (Lucide) |
|---|---|---|---|
| `inicio` | Início | `/inicio` | `LayoutDashboard` |
| `saldos` | Saldos | `/saldos/tanque`, `/saldos/lote`, `/saldos/posicao`, `/saldos/estoque-online` | `Database` |
| `veiculos` | Veículos | `/veiculos`, `/veiculos/agendamentos`, `/veiculos/novo-agendamento` | `Truck` |
| `fiscal` | Fiscal | `/fiscal/nfe` | `FileText` |
| `descargas` | Descargas | `/descargas/lote`, `/descargas/periodo` | `ArrowDownToLine` |
| `cargas` | Cargas | `/cargas/relatorio`, `/cargas/volume`, `/cargas/movimentacao` | `ArrowUpFromLine` |
| `movimentos` | Movimentos | `/movimentos` | `Activity` |
| `relatorios` | Relatórios | `/relatorios` | `Printer` |
| `qualidade` | Qualidade | `/qualidade/densidades` | `FlaskConical` |
| `admin` | Administração | `/admin` | `Settings` |

## Requisitos funcionais

### R1 — Tema Navemazônia
O ThemeProvider deve aplicar a identidade visual do protótipo:
- Primária `#0D265E` (azul marinho), secundária/destaque `#F39200` (laranja).
- Tipografia de títulos `Montserrat`; corpo `Inter`.
- Bordas arredondadas suaves (8px).

### R2 — Camada de domínio compartilhada
- **Tipos** para `Produto`, `Cliente`, `Tanque`, `Agendamento`, `Descarga`,
  `Carga`, `NFe`, `MovimentoDiario`, `Densidade`, `Usuario`, `Auditoria`,
  `ItemAgendamento`.
- **Formatadores** espelhando o protótipo: `fN` (inteiro pt-BR), `fDec(n, casas)`,
  `fBRL`, `fD` (data), `fDH` (data+hora), `fH` (hora).

### R3 — ArmazenagemService (mock) no IoC
- Classe registrada no container via `module.services` com `declaration merging`
  de `AppServices` (`armazenagem: ArmazenagemService`).
- Expõe datasets (produtos, clientes, tanques, agendamentos, descargas, cargas,
  nfes, movimentos, densidades, usuários, auditoria) e queries derivadas
  (ex.: saldos agregados, KPIs do dashboard).
- Dados determinísticos (sem aleatoriedade por render) para a demonstração.

### R4 — Módulo Início (dashboard)
KPIs (saldo disponível, bloqueado, veículos no terminal, agendamentos de hoje,
descargas/cargas no mês), barras de saldo por produto, grade de ocupação de
tanques, próximos agendamentos, últimas NF-e e lista de alertas.

### R5 — Módulo Saldos
- **Saldos por tanque** e **por lote**: tabelas filtráveis com totais.
- **Posição dos tanques**: cards com gauge de ocupação + visão tabela.
- **Estoque online**: snapshot consolidado por produto/tanque.

### R6 — Módulo Veículos
- **Situação de veículos**: alterna tabela / quadro (kanban por situação).
- **Agendamentos**: tabela com ações (editar, duplicar, cancelar, comprovante).
- **Novo agendamento**: wizard de 5 passos (dados gerais, veículo/transportadora,
  motorista/cliente de venda, produtos/janela, resumo) com validações do protótipo.

### R7 — Módulos de consulta (Fiscal, Descargas, Cargas, Movimentos, Qualidade)
Padrão comum de "consulta": barra de filtros, tabela com busca/ordenação/
paginação/densidade, e totais quando aplicável. NF-e permite seleção e ações
(XML/DANFE). Qualidade mostra densidades por tanque.

### R8 — Módulo Relatórios
Seleção de tipo de relatório (consolidado, saldo, descargas), filtros de corte/
período/cliente e **pré-visualização** em formato de papel (A4 paisagem) com
cabeçalho Navemazônia.

### R9 — Módulo Administração
Abas: Usuários e perfis, Pátios e janelas, Produtos, Tanques, Tolerâncias e
parâmetros, Log de auditoria. As abas de listagem usam tabela; a de parâmetros
usa formulário.

### R10 — Qualidade técnica
- `tsc -b` (type check) sem erros.
- `eslint` sem erros.
- `vite build` (produção) conclui com sucesso.
- Dev server renderiza as rotas sem crash.

## Fora de escopo

- Backend real / integração HTTP (mantém-se mock no service, com shape pronto
  para troca).
- Fluxo de login completo (já coberto pelo `AuthProvider` do template).
- Geração real de PDF/XLSX binário (ações disparam toasts/preview, como no
  protótipo de demonstração).
