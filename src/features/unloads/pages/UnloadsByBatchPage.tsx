import { useMemo, useState } from "react";
import { Input, PageTitleCard, Select, StatusTag, Table, type TableColumn } from "@devs-atem/design-system";
import { Search } from "lucide-react";

import { useIoC } from "@shared/hooks/useIoC";
import { useClienteAtivo } from "@shared/hooks/useClienteAtivo";
import { FilterBar } from "@shared/components/FilterBar";
import { fD, fDec, fH, fN, type Descarga } from "@shared/domain";

const TOLERANCIA = 0.5;

export const DescargasLotePage = () => {
  const svc = useIoC("armazenagem");
  const { cliente } = useClienteAtivo();
  const [search, setSearch] = useState("");
  const [produtoId, setProdutoId] = useState<number | "all">("all");

  const all = svc.descargasDe(cliente);

  // Produtos presentes nas descargas, para popular o filtro.
  const produtos = useMemo(() => {
    const ids = [...new Set(all.map((d) => d.produtoId))];
    return ids.map((id) => ({ id, nome: svc.prod(id).nome }));
  }, [all, svc]);

  const data = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((d) => {
      const matchProd = produtoId === "all" || d.produtoId === produtoId;
      const matchSearch =
        !term ||
        d.lote.toLowerCase().includes(term) ||
        svc.prod(d.produtoId).nome.toLowerCase().includes(term);
      return matchProd && matchSearch;
    });
  }, [all, search, produtoId, svc]);

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
      accessor: (d) => `${fDec(difPct(d), 2)}%`,
      render: (_v, d) => {
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
      <PageTitleCard title="Descargas por lote" subtitle={`Diferenças acima de ${fDec(TOLERANCIA, 1)}% destacadas em vermelho`} />
      <FilterBar>
        <Input
          size="sm"
          placeholder="Buscar por lote ou produto…"
          leadingIcon={<Search size={16} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 0", minWidth: 0 }}
        />
        <Select<number | "all">
          size="sm"
          value={produtoId}
          options={[{ option: "all" as const }, ...produtos.map((p) => ({ option: p.id }))]}
          getOptionItemLabel={(id) => (id === "all" ? "Todos os produtos" : produtos.find((p) => p.id === id)?.nome ?? String(id))}
          getSelectedOptionLabel={(id) => (id === "all" ? "Todos os produtos" : produtos.find((p) => p.id === id)?.nome ?? String(id))}
          getOptionKey={(id) => String(id)}
          onChange={setProdutoId}
          style={{ flex: "0 0 220px" }}
        />
      </FilterBar>
      <Table<Descarga> columns={columns} data={data} title="Descargas" />
    </div>
  );
};

export default DescargasLotePage;
