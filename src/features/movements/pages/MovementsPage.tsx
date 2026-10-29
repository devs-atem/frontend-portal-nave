import { PageTitleCard, Table, type TableColumn } from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import { useClienteAtivo } from "@shared/hooks/useClienteAtivo";
import { fN } from "@shared/domain";

interface LinhaMov {
  produtoId: number;
  produto: string;
  entradas: number;
  saidas: number;
  ajustes: number;
  saldoFinal: number;
}

export const MovimentosPage = () => {
  const svc = useIoC("armazenagem");
  const { cliente } = useClienteAtivo();
  const cliId = cliente === "all" ? null : cliente;

  const rows = svc.movimentos.filter((m) => cliId === null || m.clienteId === cliId);
  const map = new Map<number, LinhaMov>();
  for (const m of rows) {
    const l = map.get(m.produtoId) ?? { produtoId: m.produtoId, produto: svc.prod(m.produtoId).nome, entradas: 0, saidas: 0, ajustes: 0, saldoFinal: 0 };
    l.entradas += m.ent;
    l.saidas += m.sai;
    l.ajustes += m.aj;
    l.saldoFinal = m.saldo; // último do período (rows em ordem cronológica)
    map.set(m.produtoId, l);
  }
  const data = [...map.values()].sort((a, b) => b.saldoFinal - a.saldoFinal);

  const columns: TableColumn<LinhaMov>[] = [
    { id: "produto", label: "Produto", accessor: "produto", sortable: true },
    { id: "entradas", label: "Entradas (L)", accessor: (r) => fN(r.entradas), align: "right" },
    { id: "saidas", label: "Saídas (L)", accessor: (r) => fN(r.saidas), align: "right" },
    { id: "ajustes", label: "Ajustes (L)", accessor: (r) => fN(r.ajustes), align: "right" },
    { id: "saldo", label: "Saldo final (L)", accessor: (r) => fN(r.saldoFinal), align: "right", sortable: true },
  ];

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      <PageTitleCard title="Resumo das movimentações" subtitle="Entradas, saídas, ajustes e saldo final por produto (últimos 30 dias)" />
      <Table<LinhaMov> columns={columns} data={data} title="Movimentações" />
    </div>
  );
};

export default MovimentosPage;
