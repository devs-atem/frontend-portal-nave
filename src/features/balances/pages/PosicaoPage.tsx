import { useState } from "react";
import { Button, PageTitleCard, StatusTag, Table, Typography, type TableColumn } from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import { useClienteAtivo } from "@shared/hooks/useClienteAtivo";
import { ClienteSelector } from "@shared/components/ClienteSelector";
import { OccupancyTank } from "@shared/components/OccupancyTank";
import { fDH, fDec, fN, fPct, type Tanque } from "@shared/domain";

export const PosicaoPage = () => {
  const svc = useIoC("armazenagem");
  const { cliente } = useClienteAtivo();
  const [view, setView] = useState<"cards" | "tabela">("cards");
  const tqs = svc.tanquesDe(cliente);

  const columns: TableColumn<Tanque>[] = [
    { id: "codigo", label: "Tanque", accessor: "codigo", sortable: true },
    { id: "produto", label: "Produto", accessor: (t) => svc.prod(t.produtoId).nome },
    { id: "ocup", label: "Ocupação", accessor: (t) => fPct(t.vol / t.cap), align: "right" },
    { id: "vol", label: "Volume (L)", accessor: (t) => fN(t.vol), align: "right" },
    { id: "cap", label: "Capacidade (L)", accessor: (t) => fN(t.cap), align: "right" },
    { id: "temp", label: "Temperatura", accessor: (t) => `${fDec(t.temp, 1)} °C`, align: "right" },
    { id: "dens", label: "Densidade", accessor: (t) => fDec(t.densCor, 4), align: "right" },
    { id: "ult", label: "Última medição", accessor: (t) => fDH(t.ultMed) },
  ];

  const stale = (t: Tanque) => (svc.hoje.getTime() - t.ultMed.getTime()) / 86_400_000 > 7;

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      <PageTitleCard
        title="Posição dos tanques"
        subtitle={`${tqs.length} tanques · ${fN(tqs.reduce((a, t) => a + t.vol, 0))} L armazenados`}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant={view === "cards" ? "contained" : "outlined"} onClick={() => setView("cards")}>Cards</Button>
            <Button variant={view === "tabela" ? "contained" : "outlined"} onClick={() => setView("tabela")}>Tabela</Button>
            <ClienteSelector />
          </div>
        }
      />

      {view === "cards" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
          {tqs.map((t) => (
            <div key={t.id} style={{ background: "#FFFFFF", border: "1px solid #E2E6EE", borderRadius: 12, padding: 16, display: "grid", gridTemplateColumns: "80px 1fr", gap: 16 }}>
              <OccupancyTank ratio={t.vol / t.cap} color={svc.corProduto(t.produtoId)} width={70} height={122} gauge />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <Typography.H4>{t.codigo}</Typography.H4>
                  <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fPct(t.vol / t.cap)}</span>
                </div>
                <span style={{ fontSize: 13, color: "#3D4556" }}>{svc.prod(t.produtoId).nome}</span>
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 10px", fontSize: 12, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
                  <span style={{ color: "#5B6475" }}>Volume</span><span style={{ textAlign: "right" }}>{fN(t.vol)} L</span>
                  <span style={{ color: "#5B6475" }}>Capacidade</span><span style={{ textAlign: "right" }}>{fN(t.cap)} L</span>
                  <span style={{ color: "#5B6475" }}>Temperatura</span><span style={{ textAlign: "right" }}>{fDec(t.temp, 1)} °C</span>
                  <span style={{ color: "#5B6475" }}>Densidade</span><span style={{ textAlign: "right" }}>{fDec(t.densCor, 4)}</span>
                </div>
                <span style={{ fontSize: 11, color: "#5B6475", marginTop: 4 }}>Medição {fDH(t.ultMed)}</span>
                {stale(t) && <StatusTag label="Densidade desatualizada" status="warning" size="sm" />}
                {t.vol / t.cap < 0.15 && <StatusTag label="Saldo baixo" status="error" size="sm" />}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Table<Tanque> columns={columns} data={tqs} title="Tanques" />
      )}
    </div>
  );
};

export default PosicaoPage;
