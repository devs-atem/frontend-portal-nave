import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button, Input, PageTitleCard, Select, StatusTag, Table, type TableColumn, type TableRowAction } from "@devs-atem/design-system";
import { Search } from "lucide-react";

import { useIoC } from "@shared/hooks/useIoC";
import { useClienteAtivo } from "@shared/hooks/useClienteAtivo";
import { FilterBar } from "@shared/components/FilterBar";
import { fDH, fN, statusToTag, type Agendamento, type StatusAgendamento, type TipoOperacao } from "@shared/domain";

const STATUS: (StatusAgendamento | "all")[] = ["all", "Rascunho", "Enviado", "Autorizado", "Recusado", "Cancelado", "Concluído"];
const OPERACAO: (TipoOperacao | "all")[] = ["all", "Carga", "Descarga"];

export const AgendamentosPage = () => {
  const svc = useIoC("armazenagem");
  const { cliente } = useClienteAtivo();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusAgendamento | "all">("all");
  const [operacao, setOperacao] = useState<TipoOperacao | "all">("all");

  const all = svc.agendamentosDe(cliente);
  const data = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((a) => {
      const matchStatus = status === "all" || a.status === status;
      const matchOp = operacao === "all" || a.tipo === operacao;
      const matchSearch =
        !term ||
        a.codigo.toLowerCase().includes(term) ||
        (a.placa ?? a.navio ?? "").toLowerCase().includes(term) ||
        a.motorista.nome.toLowerCase().includes(term) ||
        a.itens.some((i) => svc.prod(i.produtoId).nome.toLowerCase().includes(term));
      return matchStatus && matchOp && matchSearch;
    });
  }, [all, search, status, operacao, svc]);

  const columns: TableColumn<Agendamento>[] = [
    { id: "codigo", label: "Código", accessor: "codigo", sortable: true },
    { id: "previsao", label: "Previsão de chegada", accessor: (a) => fDH(a.previsao), sortable: true },
    { id: "tipo", label: "Operação", accessor: "tipo" },
    { id: "modal", label: "Modal", accessor: "modal" },
    { id: "placa", label: "Veículo", accessor: (a) => a.placa ?? a.navio ?? "—" },
    { id: "produto", label: "Produto(s)", accessor: (a) => a.itens.map((i) => `${svc.prod(i.produtoId).nome} (${fN(i.qtd)} L)`).join(", ") },
    { id: "status", label: "Status", accessor: (a) => a.status, render: (_v, a) => <StatusTag label={a.status} status={statusToTag(a.status)} size="sm" /> },
  ];

  const actions: TableRowAction<Agendamento>[] = [
    { id: "editar", label: "Editar", icon: "Pencil", onClick: (a) => navigate(`/veiculos/novo-agendamento?codigo=${a.codigo}`), disabled: (a) => ["Cancelado", "Concluído"].includes(a.status) },
    { id: "duplicar", label: "Duplicar", icon: "Copy", onClick: () => toast.success("Agendamento duplicado. Revise motorista, data e janela.") },
    { id: "comprovante", label: "Comprovante", icon: "FileText", onClick: (a) => toast.success(`Comprovante ${a.codigo} gerado em PDF.`) },
    { id: "cancelar", label: "Cancelar", icon: "X", variant: "danger", onClick: (a) => toast.success(`Agendamento ${a.codigo} cancelado.`), disabled: (a) => ["Cancelado", "Concluído"].includes(a.status) },
  ];

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      <PageTitleCard
        title="Agendamentos"
        subtitle="Gerencie os agendamentos de carga e descarga"
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="contained" leadingIcon={undefined} onClick={() => navigate("/veiculos/novo-agendamento")}>+ Novo agendamento</Button>
          </div>
        }
      />
      <FilterBar>
        <Input
          size="sm"
          placeholder="Buscar por código, veículo, motorista ou produto…"
          leadingIcon={<Search size={16} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 0", minWidth: 0 }}
        />
        <Select<StatusAgendamento | "all">
          size="sm"
          value={status}
          options={STATUS.map((s) => ({ option: s }))}
          getOptionItemLabel={(s) => (s === "all" ? "Todos os status" : s)}
          getSelectedOptionLabel={(s) => (s === "all" ? "Todos os status" : s)}
          onChange={setStatus}
          style={{ flex: "0 0 190px" }}
        />
        <Select<TipoOperacao | "all">
          size="sm"
          value={operacao}
          options={OPERACAO.map((o) => ({ option: o }))}
          getOptionItemLabel={(o) => (o === "all" ? "Todas as operações" : o)}
          getSelectedOptionLabel={(o) => (o === "all" ? "Todas as operações" : o)}
          onChange={setOperacao}
          style={{ flex: "0 0 190px" }}
        />
      </FilterBar>
      <Table<Agendamento> columns={columns} data={data} actions={actions} title="Agendamentos" />
    </div>
  );
};

export default AgendamentosPage;
