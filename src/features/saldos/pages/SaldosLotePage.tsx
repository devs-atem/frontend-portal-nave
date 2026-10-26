import { PageTitleCard, Table, type TableColumn } from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import { useClienteAtivo } from "@shared/hooks/useClienteAtivo";
import { ClienteSelector } from "@shared/components/ClienteSelector";
import { fD, fN, type Descarga } from "@shared/domain";

export const SaldosLotePage = () => {
  const svc = useIoC("armazenagem");
  const { cliente } = useClienteAtivo();
  const data = svc.descargasDe(cliente);

  const columns: TableColumn<Descarga>[] = [
    { id: "lote", label: "Lote", accessor: "lote", sortable: true },
    { id: "data", label: "Entrada", accessor: (d) => fD(d.data), sortable: true },
    { id: "produto", label: "Produto", accessor: (d) => svc.prod(d.produtoId).nome },
    { id: "deposito", label: "Depósito", accessor: "deposito" },
    { id: "qtdRec", label: "Recebido (L)", accessor: (d) => fN(d.qtdRec), align: "right" },
    { id: "liq", label: "Peso líquido (kg)", accessor: (d) => fN(d.liq), align: "right" },
    { id: "modal", label: "Modal", accessor: "modal" },
  ];

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      <PageTitleCard title="Saldos por lote" subtitle="Saldo e rastreio por lote de descarga" actions={<ClienteSelector />} />
      <Table<Descarga> columns={columns} data={data} title="Lotes" />
    </div>
  );
};

export default SaldosLotePage;
