# Design — Portal do Cliente de Armazenagem (Navemazônia)

## Princípios

1. **Seguir o template, não reinventar.** Cada módulo é uma feature
   auto-descoberta em `src/features/<nome>/module.tsx`. Zero edição em registry
   central de rotas/menu.
2. **IoC co-localizado.** Um único `ArmazenagemService` (mock) é registrado por
   um dos módulos e consumido por todos via `useIoC("armazenagem")`. Como o IoC
   do template aplica os `services` de todos os módulos no boot, qualquer feature
   pode resolver o service.
3. **Domínio compartilhado.** Tipos e formatadores ficam em `src/shared/domain`,
   reaproveitados por todas as features — evita acoplamento entre features.
4. **Design system first.** Usar `PageTitleCard`, `KpiCard`, `Table`, `Select`,
   `StatusTag`, `Card`, `Button`, `Input`, `CustomTabs`, `Icon`, `Typography`.
   Lacunas visuais (gauges de tanque, barras) são `div`/`svg` + CSS inline,
   como o README orienta.

## Estrutura de pastas

```
src/
├── shared/
│   └── domain/
│       ├── types.ts          # tipos de domínio
│       ├── format.ts         # fN, fDec, fBRL, fD, fDH, fH
│       ├── mockData.ts       # datasets determinísticos
│       └── index.ts          # barrel
└── features/
    ├── inicio/
    │   ├── module.tsx        # name, routes, menu, services (registra armazenagem)
    │   ├── services/ArmazenagemService.ts
    │   └── pages/InicioPage.tsx
    ├── saldos/
    │   ├── module.tsx
    │   └── pages/{SaldosTanquePage,SaldosLotePage,PosicaoPage,EstoqueOnlinePage}.tsx
    ├── veiculos/
    │   ├── module.tsx
    │   ├── pages/{VeiculosPage,AgendamentosPage,NovoAgendamentoPage}.tsx
    │   └── components/wizard/...        # passos do wizard
    ├── fiscal/        (pages/NfePage.tsx)
    ├── descargas/     (pages/{DescargasLotePage,DescargasPeriodoPage}.tsx)
    ├── cargas/        (pages/{RelatorioCargasPage,CargasVolumePage,MovimentacaoPage}.tsx)
    ├── movimentos/    (pages/MovimentosPage.tsx)
    ├── relatorios/    (pages/RelatoriosPage.tsx)
    ├── qualidade/     (pages/DensidadesPage.tsx)
    └── admin/         (pages/AdminPage.tsx)
```

## Camada de domínio (`src/shared/domain`)

### `types.ts`
Interfaces TypeScript espelhando os modelos `M.*` do protótipo. Exemplos:

```ts
export interface Produto { id: number; codigo: string; nome: string; dens: number; }
export interface Cliente { id: number; codigo: string; razao: string; cnpj: string; }
export interface Tanque {
  id: number; codigo: string; produtoId: number; clienteId: number;
  cap: number; vol: number; bloqueado: number; liberado: number; semLib: number;
  temp: number; densCor: number; ultMed: Date;
}
export interface ItemAgendamento { produtoId: number; qtd: number; }
export interface Agendamento {
  id: string; codigo: string; emissao: Date; previsao: Date; tipo: "Carga" | "Descarga";
  modal: string; situacao: SituacaoVeiculo; status: StatusAgendamento;
  placa?: string; navio?: string; motorista: { nome: string; cel?: string };
  itens: ItemAgendamento[]; clienteId: number; patio?: string; /* ... */
}
// Descarga, Carga, NFe, MovimentoDiario, Densidade, Usuario, Auditoria, ...
```

Uniões de status: `StatusAgendamento`, `SituacaoVeiculo`, `SituacaoNFe`
(determinam a cor do `StatusTag`).

### `format.ts`
Formatadores pt-BR equivalentes ao protótipo:

```ts
export const fN = (v: number) => new Intl.NumberFormat("pt-BR").format(Math.round(v));
export const fDec = (v: number, c = 2) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c }).format(v);
export const fBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
export const fD = (d: Date) => d.toLocaleDateString("pt-BR");
export const fDH = (d: Date) => `${fD(d)} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
export const fH = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
```

### `mockData.ts`
Datasets determinísticos (datas relativas a uma `HOJE` fixa derivada de
`new Date()` truncada ao dia). Cobre o suficiente para as telas renderizarem com
números coerentes (ocupação, saldos, agendamentos, NF-e, movimentos, densidades,
usuários, auditoria).

## ArmazenagemService (IoC)

```ts
// src/features/inicio/services/ArmazenagemService.ts
export class ArmazenagemService {
  readonly produtos = PRODUTOS;
  readonly clientes = CLIENTES;
  readonly tanques = TANQUES;
  // ... demais datasets
  prod(id: number) { return this.produtos.find(p => p.id === id)!; }
  cli(id: number) { return this.clientes.find(c => c.id === id)!; }
  corProduto(id: number): string { /* paleta do protótipo */ }
  kpisDashboard(clienteId: number | "all") { /* agrega saldos/ags/descargas */ }
  saldoDisponivelProduto(clienteId: number, produtoId: number): number { /* ... */ }
}
```

Registro no `module.tsx` do `inicio` (primeiro módulo alfabeticamente entre os
que precisam do service; o IoC aplica todos no boot, então qualquer um serve —
escolhemos `inicio` por clareza):

```tsx
declare module "@core/ioc/registry" {
  interface AppServices { armazenagem: ArmazenagemService; }
}
const inicioModule: Module = {
  name: "inicio",
  routes: [{ path: "/inicio", element: <InicioPage /> }],
  menu: { label: "Início", path: "/inicio", icon: "LayoutDashboard", order: 0 },
  services: (c) => c.add({ armazenagem: new ArmazenagemService() }),
};
```

As demais features consomem com `const svc = useIoC("armazenagem")`.

> **Nota sobre a Home padrão do template:** `src/features/home` é substituída —
> a rota raiz passa a redirecionar para `/inicio`. Mantém-se o app "rodando out
> of the box" sem a página placeholder do template.

## Componentes compartilhados de UI

- `OccupancyTank` (gauge de tanque em SVG/CSS) — usado em Posição e no dashboard.
- `BarMeter` (barra horizontal proporcional) — saldo por produto, capacidade.
- Mapeamento `statusToTag(status): StatusTagStatus` — centraliza a tradução de
  status de domínio para a variante de cor do `StatusTag` do DS.

## Padrão de "página de consulta"

Componível a partir do DS:
- Cabeçalho: `PageTitleCard` com `title` e `actions`.
- Filtros: `Card` + `Select`/`Input`/date inputs.
- Resultado: `Table` (com `columns`, `data`, `pagination`, `onSortChange`,
  `actions`, `loading`). A `Table` do DS já cobre busca por coluna, densidade,
  toggle de colunas e paginação — então o boilerplate manual do protótipo é
  substituído pelos recursos nativos do componente.

## Roteamento

- Cada `module.tsx` declara suas `routes` (incluindo sub-rotas inline, conforme
  o README recomenda para features com até ~5 filhos).
- `menu.children` reflete as sub-rotas para a `Sidebar`.
- Rota raiz `/` → `<Navigate to="/inicio" replace />`.

## Decisões e tradeoffs

- **Uma feature por grupo de menu** (em vez de uma feature por tela) para manter
  o número de módulos gerenciável e coeso com o agrupamento do protótipo.
- **Mock no service, não em componentes**, para a troca por HTTP ser local ao
  service (injetando `IHttpService`) sem tocar nas páginas.
- **`Table` do DS no lugar da tabela manual** do protótipo: menos código, mesma
  funcionalidade essencial (ordenar, paginar, exportar via ações).
- **Determinismo**: sem `Math.random` em render (o protótipo usava em alguns
  pontos); valores fixos para o type check/build e testes serem estáveis.
