import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, Input, PageTitleCard, Select, StatusTag, Table, type TableColumn, type TableRowAction } from "@devs-atem/design-system";
import { Search } from "lucide-react";

import { useIoC } from "@shared/hooks/useIoC";
import { useClienteAtivo } from "@shared/hooks/useClienteAtivo";
import { FilterBar } from "@shared/components/FilterBar";
import { fBRL, fDH, statusToTag, type NFe, type SituacaoNFe } from "@shared/domain";

const SITUACOES: (SituacaoNFe | "all")[] = ["all", "Autorizada", "Cancelada", "Denegada", "Pendente"];

export const NfePage = () => {
  const svc = useIoC("armazenagem");
  const { cliente } = useClienteAtivo();
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [situacao, setSituacao] = useState<SituacaoNFe | "all">("all");

  const all = svc.nfesDe(cliente);
  const data = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((n) => {
      const matchSit = situacao === "all" || n.situacao === situacao;
      const matchSearch =
        !term ||
        String(n.numero).includes(term) ||
        String(n.serie).includes(term) ||
        n.chave.toLowerCase().includes(term);
      return matchSit && matchSearch;
    });
  }, [all, search, situacao]);

  const columns: TableColumn<NFe>[] = [
    { id: "numero", label: "Número", accessor: "numero", sortable: true },
    { id: "serie", label: "Série", accessor: "serie", align: "right" },
    { id: "emissao", label: "Emissão", accessor: (n) => fDH(n.emissao), sortable: true },
    { id: "chave", label: "Chave de acesso", accessor: "chave", copyable: true },
    { id: "valor", label: "Valor", accessor: (n) => fBRL(n.valor), align: "right", sortable: true },
    { id: "situacao", label: "Situação", accessor: (n) => n.situacao, render: (_v, n) => <StatusTag label={n.situacao} status={statusToTag(n.situacao)} size="sm" /> },
  ];

  const actions: TableRowAction<NFe>[] = [
    { id: "xml", label: "XML", icon: "FileCode", onClick: (n) => toast.success(`XML da nota ${n.numero} baixado.`) },
    { id: "danfe", label: "DANFE", icon: "FileText", onClick: (n) => toast.success(`DANFE da nota ${n.numero} gerada em PDF.`), disabled: (n) => !n.danfe },
  ];

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      <PageTitleCard
        title="Consulta de NF-e"
        subtitle="Notas fiscais eletrônicas emitidas"
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            {selected.length > 0 && (
              <Button variant="contained" color="warning" onClick={() => { toast.success(`${selected.length} XML + DANFE compactados em notas-fiscais.zip.`); setSelected([]); }}>
                Baixar XML + DANFE (.zip) · {selected.length}
              </Button>
            )}
          </div>
        }
      />
      <FilterBar>
        <Input
          size="sm"
          placeholder="Buscar por número, série ou chave de acesso…"
          leadingIcon={<Search size={16} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 0", minWidth: 0 }}
        />
        <Select<SituacaoNFe | "all">
          size="sm"
          value={situacao}
          options={SITUACOES.map((s) => ({ option: s }))}
          getOptionItemLabel={(s) => (s === "all" ? "Todas as situações" : s)}
          getSelectedOptionLabel={(s) => (s === "all" ? "Todas as situações" : s)}
          onChange={setSituacao}
          style={{ flex: "0 0 190px" }}
        />
      </FilterBar>
      <Table<NFe>
        columns={columns}
        data={data}
        actions={actions}
        title="NF-e"
        selectable
        selectedRows={selected}
        onSelectionChange={setSelected}
      />
    </div>
  );
};

export default NfePage;
