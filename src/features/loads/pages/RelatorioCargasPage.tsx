import { PageTitleCard, Table, type TableColumn } from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import { useClienteAtivo } from "@shared/hooks/useClienteAtivo";
import { ClienteSelector } from "@shared/components/ClienteSelector";
import { fD, fN, type Carga } from "@shared/domain";

export const RelatorioCargasPage = () => {
  const svc = useIoC("armazenagem");
  const { cliente } = useClienteAtivo();
  const data = svc.cargasDe(cliente);

  const columns: TableColumn<Carga>[] = [
    { id: "autOp", label: "Aut. operação", accessor: "autOp", sortable: true },
    { id: "data", label: "Data", accessor: (c) => fD(c.data), sortable: true },
    { id: "produto", label: "Produto", accessor: (c) => svc.prod(c.produtoId).nome },
    { id: "litros", label: "Litros", accessor: (c) => fN(c.litros), align: "right", sortable: true },
    { id: "placa", label: "Placa", accessor: "placa" },
    { id: "transp", label: "Transportadora", accessor: "transp" },
    { id: "nf", label: "NF", accessor: (c) => (c.nf ? String(c.nf) : "—"), align: "right" },
  ];

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      <PageTitleCard title="Relatório de cargas" subtitle="Cargas expedidas no terminal" actions={<ClienteSelector />} />
      <Table<Carga> columns={columns} data={data} title="Cargas" />
    </div>
  );
};

export default RelatorioCargasPage;
