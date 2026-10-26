import { PageTitleCard, StatusTag, Table, type TableColumn } from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import { useClienteAtivo } from "@shared/hooks/useClienteAtivo";
import { ClienteSelector } from "@shared/components/ClienteSelector";
import { fD, fDec, fH, fN, type Descarga } from "@shared/domain";

const TOLERANCIA = 0.5;

export const DescargasLotePage = () => {
  const svc = useIoC("armazenagem");
  const { cliente } = useClienteAtivo();
  const data = svc.descargasDe(cliente);

  const difPct = (d: Descarga) => ((d.liq - d.pesoNF) / d.pesoNF) * 100;

  const columns: TableColumn<Descarga>[] = [
    { id: "lote", label: "Lote", accessor: "lote", sortable: true },
    { id: "data", label: "Data", accessor: (d) => fD(d.data), sortable: true },
    { id: "produto", label: "Produto", accessor: (d) => svc.prod(d.produtoId).nome },
    { id: "qtdNF", label: "Qtd nota (L)", accessor: (d) => fN(d.qtdNF), align: "right" },
    { id: "pesoNF", label: "Peso nota (kg)", accessor: (d) => fN(d.pesoNF), align: "right" },
    { id: "liq", label: "Peso balança (kg)", accessor: (d) => fN(d.liq), align: "right" },
    {
      id: "dif",
      label: "Diferença",
      align: "right",
      accessor: (d) => {
        const p = difPct(d);
        const over = Math.abs(p) > TOLERANCIA;
        return <StatusTag label={`${fDec(p, 2)}%`} status={over ? "error" : "success"} size="sm" />;
      },
    },
    { id: "entrada", label: "Entrada", accessor: (d) => fH(d.entrada) },
    { id: "saida", label: "Saída", accessor: (d) => fH(d.saida) },
  ];

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      <PageTitleCard title="Descargas por lote" subtitle={`Diferenças acima de ${fDec(TOLERANCIA, 1)}% destacadas em vermelho`} actions={<ClienteSelector />} />
      <Table<Descarga> columns={columns} data={data} title="Descargas" />
    </div>
  );
};

export default DescargasLotePage;
