import { PageTitleCard, Table, Typography, type TableColumn } from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import { useClienteAtivo } from "@shared/hooks/useClienteAtivo";
import { BarMeter } from "@shared/components/BarMeter";
import { fN } from "@shared/domain";

interface LinhaVolume {
  produtoId: number;
  produto: string;
  cargas: number;
  litros: number;
}

export const CargasVolumePage = () => {
  const svc = useIoC("armazenagem");
  const { cliente } = useClienteAtivo();

  const map = new Map<number, LinhaVolume>();
  for (const c of svc.cargasDe(cliente)) {
    const l = map.get(c.produtoId) ?? { produtoId: c.produtoId, produto: svc.prod(c.produtoId).nome, cargas: 0, litros: 0 };
    l.cargas += 1;
    l.litros += c.litros;
    map.set(c.produtoId, l);
  }
  const data = [...map.values()].sort((a, b) => b.litros - a.litros);
  const max = Math.max(1, ...data.map((d) => d.litros));

  const columns: TableColumn<LinhaVolume>[] = [
    { id: "produto", label: "Produto", accessor: "produto", sortable: true },
    { id: "cargas", label: "Cargas", accessor: (r) => fN(r.cargas), align: "right" },
    { id: "litros", label: "Litros expedidos", accessor: (r) => `${fN(r.litros)} L`, align: "right", sortable: true },
  ];

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      <PageTitleCard title="Cargas por volume" subtitle="Volume expedido por produto" />
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E6EE", borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
        <Typography.H4>Litros por produto</Typography.H4>
        {data.map((d) => (
          <BarMeter key={d.produtoId} label={d.produto} ratio={d.litros / max} value={`${fN(d.litros)} L`} color={svc.corProduto(d.produtoId)} />
        ))}
      </div>
      <Table<LinhaVolume> columns={columns} data={data} title="Resumo por produto" />
    </div>
  );
};

export default CargasVolumePage;
