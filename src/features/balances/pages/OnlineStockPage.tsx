import { PageTitleCard, Table, type TableColumn } from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import { useClienteAtivo } from "@shared/hooks/useClienteAtivo";
import { fDec, fN } from "@shared/domain";

interface LinhaEstoque {
  produtoId: number;
  produto: string;
  total: number;
  bloqueado: number;
  disponivel: number;
  disponivelKg: number;
}

export const EstoqueOnlinePage = () => {
  const svc = useIoC("armazenagem");
  const { cliente } = useClienteAtivo();

  const map = new Map<number, LinhaEstoque>();
  for (const t of svc.tanquesDe(cliente)) {
    const l =
      map.get(t.produtoId) ??
      {
        produtoId: t.produtoId,
        produto: svc.prod(t.produtoId).nome,
        total: 0,
        bloqueado: 0,
        disponivel: 0,
        disponivelKg: 0,
      };
    l.total += t.vol;
    l.bloqueado += t.bloqueado;
    l.disponivel += t.vol - t.bloqueado;
    l.disponivelKg += (t.vol - t.bloqueado) * t.densCor;
    map.set(t.produtoId, l);
  }
  const data = [...map.values()].sort((a, b) => b.disponivel - a.disponivel);

  const columns: TableColumn<LinhaEstoque>[] = [
    { id: "produto", label: "Produto", accessor: "produto", sortable: true },
    { id: "total", label: "Total (L)", accessor: (r) => fN(r.total), align: "right" },
    { id: "bloqueado", label: "Bloqueado (L)", accessor: (r) => fN(r.bloqueado), align: "right" },
    { id: "disp", label: "Disponível (L)", accessor: (r) => fN(r.disponivel), align: "right" },
    { id: "dispKg", label: "Disponível (kg)", accessor: (r) => fN(r.disponivelKg), align: "right" },
    { id: "part", label: "Participação", accessor: (r) => fDec((r.disponivel / Math.max(1, data.reduce((a, x) => a + x.disponivel, 0))) * 100, 1) + "%", align: "right" },
  ];

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      <PageTitleCard title="Estoque online" subtitle="Snapshot consolidado por produto" />
      <Table<LinhaEstoque> columns={columns} data={data} title="Estoque por produto" />
    </div>
  );
};

export default EstoqueOnlinePage;
