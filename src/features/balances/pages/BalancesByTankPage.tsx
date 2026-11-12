import { PageTitleCard, Table, type TableColumn } from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import { useClienteAtivo } from "@shared/hooks/useClienteAtivo";
import { fDH, fDec, fN, fPct, type Tanque } from "@shared/domain";

export const SaldosTanquePage = () => {
  const svc = useIoC("armazenagem");
  const { cliente } = useClienteAtivo();
  const data = svc.tanquesDe(cliente);

  const columns: TableColumn<Tanque>[] = [
    { id: "codigo", label: "Tanque", accessor: "codigo", sortable: true },
    { id: "produto", label: "Produto", accessor: (t) => svc.prod(t.produtoId).nome },
    { id: "vol", label: "Volume (L)", accessor: (t) => fN(t.vol), align: "right", sortable: true },
    { id: "bloqueado", label: "Bloqueado (L)", accessor: (t) => fN(t.bloqueado), align: "right" },
    { id: "disp", label: "Disponível (L)", accessor: (t) => fN(t.vol - t.bloqueado), align: "right" },
    { id: "dispKg", label: "Disponível (kg)", accessor: (t) => fN((t.vol - t.bloqueado) * t.densCor), align: "right" },
    { id: "dens", label: "Densidade 20 °C", accessor: (t) => fDec(t.densCor, 4), align: "right" },
    { id: "ocup", label: "Ocupação", accessor: (t) => fPct(t.vol / t.cap), align: "right" },
    { id: "ult", label: "Última medição", accessor: (t) => fDH(t.ultMed) },
  ];

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      <PageTitleCard title="Saldos por tanque" subtitle="Saldo, bloqueios e disponibilidade por tanque" />
      <Table<Tanque> columns={columns} data={data} title="Tanques" />
    </div>
  );
};

export default SaldosTanquePage;
