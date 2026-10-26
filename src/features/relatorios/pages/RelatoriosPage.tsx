import { useState } from "react";
import { toast } from "sonner";
import { Button, Input, PageTitleCard, Typography } from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import { useClienteAtivo } from "@shared/hooks/useClienteAtivo";
import { fD, fDH, fDec, fN, iso } from "@shared/domain";

type TipoRelatorio = "consolidado" | "saldo" | "descargas";

const TIPOS: Array<{ id: TipoRelatorio; titulo: string; desc: string }> = [
  { id: "consolidado", titulo: "Relatório consolidado de movimentação", desc: "Saldo inicial, entradas, saídas, ajustes e saldo final por produto, em L e kg." },
  { id: "saldo", titulo: "Relatório de saldo por produto", desc: "Saldo por produto e por tanque na data de corte, com totais." },
  { id: "descargas", titulo: "Relatório de descargas", desc: "Descargas agrupadas por produto e modal, com tempos de operação." },
];

interface PaperRow {
  destaque?: boolean;
  cells: Array<{ t: string; al: "left" | "right" }>;
}

export const RelatoriosPage = () => {
  const svc = useIoC("armazenagem");
  const { cliente } = useClienteAtivo();
  const cliId = cliente === "all" ? 1 : cliente;

  const [tipo, setTipo] = useState<TipoRelatorio>("consolidado");
  const [corte, setCorte] = useState(iso(svc.hoje));
  const [zoom, setZoom] = useState(90);
  const [shown, setShown] = useState(false);

  const R = "right" as const;
  const L = "left" as const;
  const rowOf = (arr: Array<[string, "left" | "right"]>, destaque = false): PaperRow => ({
    destaque,
    cells: arr.map(([t, al]) => ({ t, al })),
  });

  function buildPaper(): { title: string; meta: string[]; cols: Array<{ l: string; al: "left" | "right" }>; rows: PaperRow[] } {
    const cli = svc.cli(cliId);
    const meta = [
      `Cliente: ${cli.razao} · CNPJ ${cli.cnpj}`,
      `Data de corte: ${fD(new Date(corte))}`,
      `Emitido em ${fDH(new Date())}`,
    ];

    if (tipo === "saldo") {
      const cols = ["Tanque", "Produto", "Total (L)", "Bloqueado (L)", "Disponível (L)", "Densidade", "Disponível (kg)"].map((l, i) => ({ l, al: i >= 2 ? R : L }));
      const rows: PaperRow[] = [];
      const G = [0, 0, 0, 0];
      for (const t of svc.tanquesDe(cliId)) {
        const disp = t.vol - t.bloqueado;
        const kg = disp * t.densCor;
        G[0] += t.vol; G[1] += t.bloqueado; G[2] += disp; G[3] += kg;
        rows.push(rowOf([
          [t.codigo, L], [svc.prod(t.produtoId).nome, L],
          [fN(t.vol), R], [fN(t.bloqueado), R], [fN(disp), R], [fDec(t.densCor, 4), R], [fN(kg), R],
        ]));
      }
      rows.push(rowOf([["Total geral", L], ["", L], [fN(G[0]), R], [fN(G[1]), R], [fN(G[2]), R], ["", R], [fN(G[3]), R]], true));
      return { title: "Relatório de saldo por produto", meta, cols, rows };
    }

    if (tipo === "descargas") {
      const cols = ["Data", "Lote", "Produto", "Modal", "Qtd nota (L)", "Recebido (L)", "Peso (kg)"].map((l, i) => ({ l, al: i >= 4 ? R : L }));
      const rows: PaperRow[] = [];
      let q = 0, r = 0, p = 0;
      for (const d of svc.descargasDe(cliId)) {
        q += d.qtdNF; r += d.qtdRec; p += d.liq;
        rows.push(rowOf([
          [fD(d.data), L], [d.lote, L], [svc.prod(d.produtoId).nome, L], [d.modal, L],
          [fN(d.qtdNF), R], [fN(d.qtdRec), R], [fN(d.liq), R],
        ]));
      }
      rows.push(rowOf([["Total", L], ["", L], ["", L], ["", L], [fN(q), R], [fN(r), R], [fN(p), R]], true));
      return { title: "Relatório de descargas", meta, cols, rows };
    }

    // consolidado
    const cols = ["Produto", "Entradas (L)", "Saídas (L)", "Ajustes (L)", "Saldo final (L)", "Saldo final (kg)"].map((l, i) => ({ l, al: i >= 1 ? R : L }));
    const rows: PaperRow[] = [];
    const T = [0, 0, 0, 0, 0];
    const porProduto = new Map<number, { e: number; s: number; a: number; saldo: number; dens: number }>();
    for (const m of svc.movimentos.filter((x) => x.clienteId === cliId)) {
      const acc = porProduto.get(m.produtoId) ?? { e: 0, s: 0, a: 0, saldo: 0, dens: m.dens };
      acc.e += m.ent; acc.s += m.sai; acc.a += m.aj; acc.saldo = m.saldo;
      porProduto.set(m.produtoId, acc);
    }
    for (const [pid, acc] of porProduto) {
      const kg = acc.saldo * acc.dens;
      T[0] += acc.e; T[1] += acc.s; T[2] += acc.a; T[3] += acc.saldo; T[4] += kg;
      rows.push(rowOf([
        [svc.prod(pid).nome, L], [fN(acc.e), R], [fN(acc.s), R], [fN(acc.a), R], [fN(acc.saldo), R], [fN(kg), R],
      ]));
    }
    rows.push(rowOf([["Total", L], [fN(T[0]), R], [fN(T[1]), R], [fN(T[2]), R], [fN(T[3]), R], [fN(T[4]), R]], true));
    return { title: "Relatório consolidado de movimentação", meta, cols, rows };
  }

  const paper = shown ? buildPaper() : null;

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      <PageTitleCard title="Relatórios" subtitle="Gere e pré-visualize relatórios em PDF" />

      {/* Seleção de tipo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 12 }}>
        {TIPOS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => { setTipo(r.id); setShown(false); }}
            style={{ textAlign: "left", background: tipo === r.id ? "#EAF0FA" : "#FFFFFF", border: `1.5px solid ${tipo === r.id ? "#0D265E" : "#E2E6EE"}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4 }}
          >
            <span style={{ fontWeight: 600, color: "#0D265E" }}>{r.titulo}</span>
            <span style={{ fontSize: 12, color: "#3D4556", lineHeight: 1.45 }}>{r.desc}</span>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E6EE", borderRadius: 12, padding: "16px 18px", display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end" }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#3D4556", display: "flex", flexDirection: "column", gap: 5 }}>
          Data de corte *
          <Input type="date" value={corte} onChange={(e) => { setCorte(e.target.value); setShown(false); }} />
        </label>
        <Button variant="contained" onClick={() => setShown(true)}>Pré-visualizar</Button>
        <Button variant="outlined" onClick={() => toast.success("Envio recorrente agendado.")}>Agendar envio recorrente</Button>
      </div>

      {!shown && (
        <div style={{ background: "#FFFFFF", border: "1px dashed #CDD3DE", borderRadius: 12, padding: "48px 24px", textAlign: "center", color: "#5B6475" }}>
          Preencha os filtros e clique em Pré-visualizar para ver o relatório.
        </div>
      )}

      {paper && (
        <div style={{ background: "#E9ECF2", borderRadius: 12, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "10px 14px", background: "#FFFFFF", border: "1px solid #E2E6EE", borderRadius: "12px 12px 0 0" }}>
            <Button variant="outlined" size="sm" onClick={() => setZoom((z) => Math.max(50, z - 10))}>−</Button>
            <span style={{ minWidth: 48, textAlign: "center", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{zoom}%</span>
            <Button variant="outlined" size="sm" onClick={() => setZoom((z) => Math.min(150, z + 10))}>+</Button>
            <div style={{ flex: 1 }} />
            <Button variant="outlined" size="sm" onClick={() => toast.success("Enviando para impressão…")}>Imprimir</Button>
            <Button variant="outlined" size="sm" onClick={() => toast.success("Planilha Excel gerada.")}>Excel</Button>
            <Button variant="contained" size="sm" onClick={() => toast.success(`PDF gerado: ${paper.title}.pdf`)}>Baixar PDF</Button>
          </div>
          <div style={{ overflow: "auto", padding: 24 }}>
            <div style={{ zoom: zoom / 100, width: 1120, margin: "0 auto", background: "#FFFFFF", boxShadow: "0 4px 18px rgba(13,38,94,0.14)", padding: "36px 40px", display: "flex", flexDirection: "column", gap: 16, fontSize: 11 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, borderBottom: "2px solid #0D265E", paddingBottom: 12 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 600, letterSpacing: "0.14em", color: "#0D265E", fontSize: 13 }}>NAVEMAZÔNIA</span>
                  <span style={{ color: "#3D4556" }}>Navemazônia Navegação e Armazenagem Ltda · Terminal de Manaus/AM</span>
                </div>
                <Typography.H4>{paper.title}</Typography.H4>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, color: "#3D4556" }}>
                {paper.meta.map((m) => <span key={m}>{m}</span>)}
              </div>
              <table style={{ borderCollapse: "collapse", width: "100%", fontVariantNumeric: "tabular-nums" }}>
                <thead>
                  <tr>
                    {paper.cols.map((c) => (
                      <th key={c.l} style={{ textAlign: c.al, padding: "6px", borderBottom: "1.5px solid #0D265E", color: "#0D265E", fontWeight: 700, whiteSpace: "nowrap" }}>{c.l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paper.rows.map((r, i) => (
                    <tr key={i} style={{ background: r.destaque ? "#F1F3F7" : "#FFFFFF", fontWeight: r.destaque ? 700 : 400 }}>
                      {r.cells.map((c, j) => (
                        <td key={j} style={{ textAlign: c.al, padding: "5px 6px", borderBottom: "1px solid #E2E6EE", whiteSpace: "nowrap" }}>{c.t}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#5B6475", borderTop: "1px solid #E2E6EE", paddingTop: 8 }}>
                <span>Documento gerado pelo Portal do Cliente de Armazenagem</span>
                <span>Página 1 de 1 · Paisagem</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelatoriosPage;
