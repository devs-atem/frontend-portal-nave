import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button, PageTitleCard, StatusTag, Table, type TableColumn, type TableRowAction } from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import { useClienteAtivo } from "@shared/hooks/useClienteAtivo";
import { ClienteSelector } from "@shared/components/ClienteSelector";
import { fDH, fN, statusToTag, type Agendamento } from "@shared/domain";

export const AgendamentosPage = () => {
  const svc = useIoC("armazenagem");
  const { cliente } = useClienteAtivo();
  const navigate = useNavigate();
  const data = svc.agendamentosDe(cliente);

  const columns: TableColumn<Agendamento>[] = [
    { id: "codigo", label: "Código", accessor: "codigo", sortable: true },
    { id: "previsao", label: "Previsão de chegada", accessor: (a) => fDH(a.previsao), sortable: true },
    { id: "tipo", label: "Operação", accessor: "tipo" },
    { id: "modal", label: "Modal", accessor: "modal" },
    { id: "placa", label: "Veículo", accessor: (a) => a.placa ?? a.navio ?? "—" },
    { id: "produto", label: "Produto(s)", accessor: (a) => a.itens.map((i) => `${svc.prod(i.produtoId).nome} (${fN(i.qtd)} L)`).join(", ") },
    { id: "status", label: "Status", accessor: (a) => <StatusTag label={a.status} status={statusToTag(a.status)} size="sm" /> },
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
            <ClienteSelector />
          </div>
        }
      />
      <Table<Agendamento> columns={columns} data={data} actions={actions} title="Agendamentos" />
    </div>
  );
};

export default AgendamentosPage;
