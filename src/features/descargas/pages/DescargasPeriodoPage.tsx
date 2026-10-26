import { PageTitleCard, Table, Typography, type TableColumn } from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import { useClienteAtivo } from "@shared/hooks/useClienteAtivo";
import { ClienteSelector } from "@shared/components/ClienteSelector";
import { BarMeter } from "@shared/components/BarMeter";
import { fN } from "@shared/domain";

interface LinhaPeriodo {
  chave: string;
  produto: string;
  modal: string;
  qtd: number;
  litros: number;
}

export const DescargasPeriodoPage = () => {
  const svc = useIoC("armazenagem");
  const { cliente } = useClienteAtivo();

  const map = new Map<string, LinhaPeriodo>();
  for (const d of svc.descargasDe(cliente)) {
    const produto = svc.prod(d.produtoId).nome;
    const chave = `${produto} · ${d.modal}`;
    const l = map.get(chave) ?? { chave, produto, modal: d.modal, qtd: 0, litros: 0 };
    l.qtd += 1;
    l.litros += d.qtdRec;
    map.set(chave, l);
  }
  const data = [...map.values()].sort((a, b) => b.litros - a.litros);
  const max = Math.max(1, ...data.map((d) => d.litros));

  const columns: TableColumn<LinhaPeriodo>[] = [
    { id: "produto", label: "Produto", accessor: "produto", sortable: true },
    { id: "modal", label: "Modal", accessor: "modal" },
    { id: "qtd", label: "Descargas", accessor: (r) => fN(r.qtd), align: "right" },
    { id: "litros", label: "Litros recebidos", accessor: (r) => `${fN(r.litros)} L`, align: "right", sortable: true },
  ];

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      <PageTitleCard title="Descargas por período" subtitle="Volume descarregado por produto e modal" actions={<ClienteSelector />} />

      <div style={{ background: "#FFFFFF", border: "1px solid #E2E6EE", borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
        <Typography.H4>Litros por produto e modal</Typography.H4>
        {data.map((d) => (
          <BarMeter key={d.chave} label={d.chave} ratio={d.litros / max} value={`${fN(d.litros)} L`} color={d.modal === "Marítimo" ? "#0D265E" : "#F39200"} />
        ))}
      </div>

      <Table<LinhaPeriodo> columns={columns} data={data} title="Resumo do período" />
    </div>
  );
};

export default DescargasPeriodoPage;
