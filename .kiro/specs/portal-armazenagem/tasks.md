# Tasks — Portal do Cliente de Armazenagem (Navemazônia)

- [ ] 1. **Tema Navemazônia** — `src/core/providers/ThemeProvider.tsx`
  - Overrides: primária `#0D265E`, secundária `#F39200`, foco `#F39200`,
    tipografia Montserrat/Inter, radius 8px. (R1)

- [ ] 2. **Domínio: tipos** — `src/shared/domain/types.ts` (R2)
  - Produto, Cliente, Tanque, ItemAgendamento, Agendamento, Descarga, Carga,
    NFe, MovimentoDiario, Densidade, Usuario, Auditoria + uniões de status.

- [ ] 3. **Domínio: formatadores** — `src/shared/domain/format.ts` (R2)
  - fN, fDec, fBRL, fD, fDH, fH + `statusToTag`.

- [ ] 4. **Domínio: mock data** — `src/shared/domain/mockData.ts` (R3)
  - Datasets determinísticos coerentes para todas as telas.

- [ ] 5. **ArmazenagemService** — `src/features/inicio/services/ArmazenagemService.ts` (R3)
  - Datasets + queries (kpisDashboard, saldoDisponivelProduto, corProduto, etc.).

- [ ] 6. **Módulo Início** — `src/features/inicio/` (R4)
  - `module.tsx` (registra o service + menu order 0), `InicioPage` com KPIs,
    barras, gauges, próximos agendamentos, NF-e, alertas.
  - Substituir `src/features/home` e redirecionar `/` → `/inicio`.

- [ ] 7. **Módulo Saldos** — `src/features/saldos/` (R5)
  - Sub-rotas tanque/lote/posicao/estoque-online + menu com children.

- [ ] 8. **Módulo Veículos** — `src/features/veiculos/` (R6)
  - Situação (tabela/kanban), Agendamentos (tabela + ações), Novo agendamento
    (wizard 5 passos com validações).

- [ ] 9. **Módulo Fiscal (NF-e)** — `src/features/fiscal/` (R7)

- [ ] 10. **Módulo Descargas** — `src/features/descargas/` (R7)

- [ ] 11. **Módulo Cargas** — `src/features/cargas/` (R7)

- [ ] 12. **Módulo Movimentos** — `src/features/movimentos/` (R7)

- [ ] 13. **Módulo Qualidade (densidades)** — `src/features/qualidade/` (R7)

- [ ] 14. **Módulo Relatórios** — `src/features/relatorios/` (R8)
  - Seleção de tipo, filtros, pré-visualização em papel A4 paisagem.

- [ ] 15. **Módulo Administração** — `src/features/admin/` (R9)
  - Abas: usuários, pátios, produtos, tanques, parâmetros, auditoria.

- [ ] 16. **Verificação** (R10)
  - `yarn tsc -b` / `yarn build`, `yarn lint`, smoke test do dev server.
