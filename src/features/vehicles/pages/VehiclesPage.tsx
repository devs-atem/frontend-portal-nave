import { useMemo, useState } from "react";
import { Button, Input, PageTitleCard, Select, StatusTag, Table, type TableColumn } from "@devs-atem/design-system";
import { Search } from "lucide-react";

import { useIoC } from "@shared/hooks/useIoC";
import { useClienteAtivo } from "@shared/hooks/useClienteAtivo";
import { FilterBar } from "@shared/components/FilterBar";
import { fH, statusToTag, type Agendamento, type SituacaoVeiculo } from "@shared/domain";

const SITUACOES: SituacaoVeiculo[] = [
  "Agendado",
  "No pré-gate",
  "Aguardando chamada",
  "Em operação",
  "Liberado",
];

const SITUACAO_OPTS: (SituacaoVeiculo | "all")[] = ["all", ...SITUACOES];

export const VeiculosPage = () => {
  const svc = useIoC("armazenagem");
  const { cliente } = useClienteAtivo();
  const [view, setView] = useState<"tabela" | "quadro">("tabela");
  const [search, setSearch] = useState("");
  const [situacao, setSituacao] = useState<SituacaoVeiculo | "all">("all");

  const base = svc.agendamentosDe(cliente).filter((a) => a.status !== "Cancelado");
  const data = useMemo(() => {
    const term = search.trim().toLowerCase();
    return base.filter((a) => {
      const matchSit = situacao === "all" || a.situacao === situacao;
      const matchSearch =
        !term ||
        a.codigo.toLowerCase().includes(term) ||
        (a.placa ?? a.navio ?? "").toLowerCase().includes(term) ||
        a.motorista.nome.toLowerCase().includes(term) ||
        a.itens.some((i) => svc.prod(i.produtoId).nome.toLowerCase().includes(term));
      return matchSit && matchSearch;
    });
  }, [base, search, situacao, svc]);

  const columns: TableColumn<Agendamento>[] = [
    { id: "codigo", label: "Agendamento", accessor: "codigo", sortable: true },
    { id: "placa", label: "Veículo", accessor: (a) => a.placa ?? a.navio ?? "—" },
    { id: "motorista", label: "Motorista", accessor: (a) => a.motorista.nome },
    { id: "tipo", label: "Operação", accessor: "tipo" },
    { id: "produto", label: "Produto(s)", accessor: (a) => a.itens.map((i) => svc.prod(i.produtoId).nome).join(", ") },
    { id: "prev", label: "Previsão", accessor: (a) => fH(a.previsao), align: "right" },
    { id: "situacao", label: "Situação", accessor: (a) => a.situacao, render: (_v, a) => <StatusTag label={a.situacao} status={statusToTag(a.situacao)} size="sm" /> },
  ];

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      <PageTitleCard
        title="Situação de veículos"
        subtitle="Acompanhe os veículos no terminal em tempo real"
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant={view === "tabela" ? "contained" : "outlined"} onClick={() => setView("tabela")}>Tabela</Button>
            <Button variant={view === "quadro" ? "contained" : "outlined"} onClick={() => setView("quadro")}>Quadro</Button>
          </div>
        }
      />

      <FilterBar>
        <Input
          size="sm"
          placeholder="Buscar por agendamento, veículo, motorista ou produto…"
          leadingIcon={<Search size={16} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 0", minWidth: 0 }}
        />
        <Select<SituacaoVeiculo | "all">
          size="sm"
          value={situacao}
          options={SITUACAO_OPTS.map((s) => ({ option: s }))}
          getOptionItemLabel={(s) => (s === "all" ? "Todas as situações" : s)}
          getSelectedOptionLabel={(s) => (s === "all" ? "Todas as situações" : s)}
          onChange={setSituacao}
          style={{ flex: "0 0 210px" }}
        />
      </FilterBar>

      {view === "tabela" ? (
        <Table<Agendamento> columns={columns} data={data} title="Veículos" />
      ) : (
        <div style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: "minmax(230px,1fr)", gap: 12, overflowX: "auto" }}>
          {SITUACOES.map((sit) => {
            const cards = data.filter((a) => a.situacao === sit);
            return (
              <div key={sit} style={{ background: "#F5F7FA", borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 8, minHeight: 240 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 13, color: "#0D265E" }}>
                  <StatusTag label={sit} status={statusToTag(sit)} size="sm" />
                  <span style={{ marginLeft: "auto", background: "#FFFFFF", border: "1px solid #E2E6EE", borderRadius: 999, padding: "0 8px", fontSize: 12, color: "#3D4556" }}>{cards.length}</span>
                </div>
                {cards.map((a) => (
                  <div key={a.id} style={{ background: "#FFFFFF", border: "1px solid #E2E6EE", borderRadius: 8, padding: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#5B6475" }}>
                      <span>{a.codigo} · {a.tipo}</span>
                      <span style={{ fontWeight: 600, color: "#0D265E" }}>{fH(a.previsao)}</span>
                    </div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 500, fontSize: 14 }}>{a.placa ?? a.navio}</div>
                    <div style={{ fontSize: 12, color: "#3D4556" }}>{a.motorista.nome}</div>
                    <div style={{ fontSize: 12, color: "#5B6475" }}>{a.itens.map((i) => svc.prod(i.produtoId).nome).join(", ")}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VeiculosPage;
