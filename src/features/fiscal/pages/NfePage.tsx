import { useState } from "react";
import { toast } from "sonner";
import { Button, PageTitleCard, StatusTag, Table, type TableColumn, type TableRowAction } from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import { useClienteAtivo } from "@shared/hooks/useClienteAtivo";
import { ClienteSelector } from "@shared/components/ClienteSelector";
import { fBRL, fDH, statusToTag, type NFe } from "@shared/domain";

export const NfePage = () => {
  const svc = useIoC("armazenagem");
  const { cliente } = useClienteAtivo();
  const [selected, setSelected] = useState<number[]>([]);
  const data = svc.nfesDe(cliente);

  const columns: TableColumn<NFe>[] = [
    { id: "numero", label: "Número", accessor: "numero", sortable: true },
    { id: "serie", label: "Série", accessor: "serie", align: "right" },
    { id: "emissao", label: "Emissão", accessor: (n) => fDH(n.emissao), sortable: true },
    { id: "chave", label: "Chave de acesso", accessor: "chave", copyable: true },
    { id: "valor", label: "Valor", accessor: (n) => fBRL(n.valor), align: "right", sortable: true },
    { id: "situacao", label: "Situação", accessor: (n) => <StatusTag label={n.situacao} status={statusToTag(n.situacao)} size="sm" /> },
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
            <ClienteSelector />
          </div>
        }
      />
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
