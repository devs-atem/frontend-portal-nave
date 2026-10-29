import {
  AGENDAMENTOS,
  AUDITORIA,
  CARGAS,
  CLIENTES,
  COR_PRODUTO,
  DENSIDADES,
  DESCARGAS,
  HOJE,
  MOV_DIARIO,
  NFES,
  PRODUTOS,
  TANQUES,
  USUARIOS,
  type Agendamento,
  type Cliente,
  type KpisDashboard,
  type Produto,
  type Tanque,
} from "@shared/domain";

export type ClienteFiltro = number | "all";

/**
 * Service de domínio do Portal de Armazenagem.
 *
 * Mock determinístico. O shape (métodos de query) foi pensado para que a troca
 * por chamadas HTTP seja local a esta classe — basta injetar `IHttpService` no
 * construtor e trocar os retornos síncronos por Promises.
 */
export class ArmazenagemService {
  readonly produtos = PRODUTOS;
  readonly clientes = CLIENTES;
  readonly tanques = TANQUES;
  readonly agendamentos = AGENDAMENTOS;
  readonly descargas = DESCARGAS;
  readonly cargas = CARGAS;
  readonly nfes = NFES;
  readonly movimentos = MOV_DIARIO;
  readonly densidades = DENSIDADES;
  readonly usuarios = USUARIOS;
  readonly auditoria = AUDITORIA;
  readonly hoje = HOJE;

  prod(id: number): Produto {
    return this.produtos.find((p) => p.id === id)!;
  }

  cli(id: number): Cliente {
    return this.clientes.find((c) => c.id === id)!;
  }

  corProduto(id: number): string {
    return COR_PRODUTO[id] ?? "#0D265E";
  }

  private byCliente<T extends { clienteId: number }>(
    rows: T[],
    cliente: ClienteFiltro,
  ): T[] {
    return cliente === "all"
      ? rows
      : rows.filter((r) => r.clienteId === cliente);
  }

  tanquesDe(cliente: ClienteFiltro): Tanque[] {
    return this.byCliente(this.tanques, cliente);
  }

  agendamentosDe(cliente: ClienteFiltro): Agendamento[] {
    return this.byCliente(this.agendamentos, cliente);
  }

  descargasDe(cliente: ClienteFiltro) {
    return this.byCliente(this.descargas, cliente);
  }

  cargasDe(cliente: ClienteFiltro) {
    return this.byCliente(this.cargas, cliente);
  }

  nfesDe(cliente: ClienteFiltro) {
    return this.byCliente(this.nfes, cliente);
  }

  /** Saldo disponível (L) de um produto para um cliente, somando tanques. */
  saldoDisponivelProduto(clienteId: number, produtoId: number): number {
    return this.tanques
      .filter((t) => t.clienteId === clienteId && t.produtoId === produtoId)
      .reduce((acc, t) => acc + (t.vol - t.bloqueado), 0);
  }

  /** Saldo disponível por produto (L), para gráficos. */
  saldoPorProduto(cliente: ClienteFiltro): Array<{ produtoId: number; litros: number }> {
    const map = new Map<number, number>();
    for (const t of this.tanquesDe(cliente)) {
      map.set(t.produtoId, (map.get(t.produtoId) ?? 0) + (t.vol - t.bloqueado));
    }
    return [...map.entries()]
      .map(([produtoId, litros]) => ({ produtoId, litros }))
      .sort((a, b) => b.litros - a.litros);
  }

  /**
   * Série diária de entradas × saídas (L) do cliente nos últimos N dias,
   * com o saldo acumulado ao fim de cada dia. Usado no gráfico do dashboard.
   */
  movimentoDiarioDe(
    cliente: ClienteFiltro,
  ): Array<{ data: Date; ent: number; sai: number; saldo: number }> {
    const rows =
      cliente === "all"
        ? this.movimentos
        : this.movimentos.filter((m) => m.clienteId === cliente);

    // Agrega por dia (somando todos os produtos/clientes do escopo).
    const map = new Map<number, { data: Date; ent: number; sai: number; saldo: number }>();
    for (const m of rows) {
      const key = new Date(m.data).setHours(0, 0, 0, 0);
      const acc = map.get(key) ?? {
        data: new Date(key),
        ent: 0,
        sai: 0,
        saldo: 0,
      };
      acc.ent += m.ent;
      acc.sai += m.sai;
      acc.saldo += m.saldo;
      map.set(key, acc);
    }

    return [...map.values()].sort((a, b) => a.data.getTime() - b.data.getTime());
  }

  private mesmoDia(d: Date, offset: number): boolean {
    const x = new Date(this.hoje);
    x.setDate(x.getDate() + offset);
    return d.getDate() === x.getDate() && d.getMonth() === x.getMonth();
  }

  private noMes(d: Date): boolean {
    return (
      d.getMonth() === this.hoje.getMonth() &&
      d.getFullYear() === this.hoje.getFullYear()
    );
  }

  kpisDashboard(cliente: ClienteFiltro): KpisDashboard {
    const tqs = this.tanquesDe(cliente);
    const total = tqs.reduce((a, t) => a + t.vol, 0);
    const bloqueado = tqs.reduce((a, t) => a + t.bloqueado, 0);
    const disponivel = total - bloqueado;
    const disponivelKg = tqs.reduce((a, t) => a + (t.vol - t.bloqueado) * t.densCor, 0);
    const bloqueadoKg = tqs.reduce((a, t) => a + t.bloqueado * t.densCor, 0);

    const ags = this.agendamentosDe(cliente);
    const noTerminal = ags.filter((a) =>
      ["No pré-gate", "Aguardando chamada", "Em operação"].includes(a.situacao),
    );
    const hoje = ags.filter(
      (a) => this.mesmoDia(a.previsao, 0) && a.status !== "Cancelado",
    );

    const desc = this.descargasDe(cliente).filter((d) => this.noMes(d.data));
    const carg = this.cargasDe(cliente).filter((c) => this.noMes(c.data));

    return {
      disponivel,
      disponivelKg,
      bloqueado,
      bloqueadoKg,
      veiculosNoTerminal: noTerminal.length,
      veiculosEmOperacao: noTerminal.filter((a) => a.situacao === "Em operação").length,
      agendamentosHoje: hoje.length,
      descargasMes: desc.length,
      litrosRecebidosMes: desc.reduce((a, d) => a + d.qtdRec, 0),
      cargasMes: carg.length,
      litrosExpedidosMes: carg.reduce((a, c) => a + c.litros, 0),
    };
  }

  /** Próximos agendamentos (hoje/amanhã), ordenados por previsão. */
  proximosAgendamentos(cliente: ClienteFiltro, limite = 6): Agendamento[] {
    return this.agendamentosDe(cliente)
      .filter(
        (a) =>
          (this.mesmoDia(a.previsao, 0) || this.mesmoDia(a.previsao, 1)) &&
          ["Agendado"].includes(a.situacao) &&
          a.status !== "Cancelado",
      )
      .sort((a, b) => a.previsao.getTime() - b.previsao.getTime())
      .slice(0, limite);
  }

  /** Alertas do dashboard (divergências, saldo baixo, densidade desatualizada). */
  alertas(
    cliente: ClienteFiltro,
    tolerancia = 0.5,
  ): Array<{ titulo: string; detalhe: string; cor: string }> {
    const out: Array<{ titulo: string; detalhe: string; cor: string }> = [];
    for (const d of this.descargasDe(cliente)) {
      const difPct = ((d.liq - d.pesoNF) / d.pesoNF) * 100;
      if (Math.abs(difPct) > tolerancia) {
        out.push({
          titulo: "Divergência de peso",
          detalhe: `Lote ${d.lote} · ${difPct.toFixed(2)}% (${Math.round(d.liq - d.pesoNF)} kg)`,
          cor: "#D64545",
        });
      }
    }
    for (const t of this.tanquesDe(cliente)) {
      if (t.vol / t.cap < 0.15) {
        out.push({
          titulo: "Saldo baixo",
          detalhe: `${t.codigo} · ${this.prod(t.produtoId).nome} com ${((t.vol / t.cap) * 100).toFixed(0)}% de ocupação`,
          cor: "#E0A100",
        });
      }
      if ((this.hoje.getTime() - t.ultMed.getTime()) / 86_400_000 > 7) {
        out.push({
          titulo: "Densidade desatualizada",
          detalhe: `${t.codigo} · última medição há mais de 7 dias`,
          cor: "#E0A100",
        });
      }
    }
    return out;
  }
}
