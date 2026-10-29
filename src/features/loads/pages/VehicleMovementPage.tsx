import { PageTitleCard, Table, type TableColumn } from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import { useClienteAtivo } from "@shared/hooks/useClienteAtivo";
import { fD, fN, type Carga } from "@shared/domain";

export const MovimentacaoPage = () => {
  const svc = useIoC("armazenagem");
  const { cliente } = useClienteAtivo();
  const data = svc.cargasDe(cliente);

  const columns: TableColumn<Carga>[] = [
    { id: "data", label: "Data", accessor: (c) => fD(c.data), sortable: true },
    { id: "placa", label: "Placa", accessor: "placa", sortable: true },
    { id: "transp", label: "Transportadora", accessor: "transp" },
    { id: "modal", label: "Modal", accessor: "modal" },
    { id: "produto", label: "Produto", accessor: (c) => svc.prod(c.produtoId).nome },
    { id: "litros", label: "Litros", accessor: (c) => fN(c.litros), align: "right" },
  ];

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      <PageTitleCard title="Movimentação de veículos" subtitle="Veículos envolvidos nas cargas" />
      <Table<Carga> columns={columns} data={data} title="Movimentação" />
    </div>
  );
};

export default MovimentacaoPage;
