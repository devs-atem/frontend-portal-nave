import { useState } from "react";
import { PageTitleCard, Select, Table, type TableColumn } from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import { useClienteAtivo } from "@shared/hooks/useClienteAtivo";
import { ClienteSelector } from "@shared/components/ClienteSelector";
import { fDH, fDec, type Densidade } from "@shared/domain";

export const DensidadesPage = () => {
  const svc = useIoC("armazenagem");
  const { cliente } = useClienteAtivo();
  const tanques = svc.tanquesDe(cliente);
  const [tanqueId, setTanqueId] = useState<number>(tanques[0]?.id ?? 0);

  const data = svc.densidades
    .filter((d) => d.tanqueId === tanqueId)
    .sort((a, b) => b.data.getTime() - a.data.getTime());

  const columns: TableColumn<Densidade>[] = [
    { id: "data", label: "Data/hora", accessor: (d) => fDH(d.data), sortable: true },
    { id: "densO", label: "Densidade observada", accessor: (d) => fDec(d.densO, 4), align: "right" },
    { id: "densC", label: "Densidade corrigida (20 °C)", accessor: (d) => fDec(d.densC, 4), align: "right" },
    { id: "temp", label: "Temperatura", accessor: (d) => `${fDec(d.temp, 1)} °C`, align: "right" },
  ];

  const tanque = tanques.find((t) => t.id === tanqueId);

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      <PageTitleCard
        title="Densidades do tanque"
        subtitle={tanque ? `${tanque.codigo} · ${svc.prod(tanque.produtoId).nome}` : "Selecione um tanque"}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <Select<number>
              value={tanqueId}
              options={tanques.map((t) => ({ option: t.id }))}
              getOptionItemLabel={(id) => svc.tanques.find((t) => t.id === id)!.codigo}
              getSelectedOptionLabel={(id) => svc.tanques.find((t) => t.id === id)!.codigo}
              getOptionKey={(id) => String(id)}
              onChange={setTanqueId}
              size="sm"
            />
            <ClienteSelector />
          </div>
        }
      />
      <Table<Densidade> columns={columns} data={data} title="Histórico de densidade" />
    </div>
  );
};

export default DensidadesPage;
