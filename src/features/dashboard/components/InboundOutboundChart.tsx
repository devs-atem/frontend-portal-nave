import { useMemo } from "react";
import { Typography } from "@devs-atem/design-system";

import { fD, fN } from "@shared/domain";

export interface MovimentoDia {
  data: Date;
  ent: number;
  sai: number;
  saldo: number;
}

interface InboundOutboundChartProps {
  dados: MovimentoDia[];
}

const COR_ENTRADA = "#0D265E";
const COR_SAIDA = "#F39200";
const COR_SALDO = "#1F8A5B";

/** Dimensões do viewBox (coordenadas internas do SVG). */
const VB_W = 900;
const VB_H = 300;
const PAD = { top: 16, right: 16, bottom: 28, left: 16 };

/**
 * Gráfico combinado entradas × saídas (barras) + saldo (linha) dos últimos dias.
 * SVG puro, responsivo via viewBox. Recebe os dados já agregados.
 */
export const InboundOutboundChart = ({ dados }: InboundOutboundChartProps) => {
  const chart = useMemo(() => {
    if (dados.length === 0) return null;

    const innerW = VB_W - PAD.left - PAD.right;
    const innerH = VB_H - PAD.top - PAD.bottom;

    const maxBar = Math.max(1, ...dados.map((d) => Math.max(d.ent, d.sai)));
    const maxSaldo = Math.max(1, ...dados.map((d) => d.saldo));

    const slot = innerW / dados.length;
    const barW = Math.min(slot * 0.32, 10);

    const bars = dados.map((d, i) => {
      const cx = PAD.left + slot * i + slot / 2;
      const entH = (d.ent / maxBar) * innerH;
      const saiH = (d.sai / maxBar) * innerH;
      const baseY = PAD.top + innerH;
      return {
        entX: cx - barW - 1,
        entY: baseY - entH,
        entH,
        saiX: cx + 1,
        saiY: baseY - saiH,
        saiH,
        barW,
      };
    });

    // Linha de saldo (normalizada pelo máximo de saldo).
    const linePoints = dados.map((d, i) => {
      const cx = PAD.left + slot * i + slot / 2;
      const y = PAD.top + innerH - (d.saldo / maxSaldo) * innerH;
      return `${cx.toFixed(1)},${y.toFixed(1)}`;
    });

    const mediaDiaria =
      dados.reduce((acc, d) => acc + d.ent + d.sai, 0) / dados.length;

    return {
      bars,
      linePath: `M ${linePoints.join(" L ")}`,
      baseY: PAD.top + innerH,
      primeiraData: dados[0].data,
      ultimaData: dados[dados.length - 1].data,
      mediaDiaria,
    };
  }, [dados]);

  return (
    <section className="nm-chart">
      <div className="nm-chart__head">
        <Typography.H4>Entradas × saídas — últimos 30 dias</Typography.H4>
        <ul className="nm-chart__legend" aria-hidden="true">
          <li>
            <span style={{ background: COR_ENTRADA }} /> Entradas
          </li>
          <li>
            <span style={{ background: COR_SAIDA }} /> Saídas
          </li>
          <li>
            <span className="nm-chart__legend-line" style={{ background: COR_SALDO }} />{" "}
            Saldo
          </li>
        </ul>
      </div>

      {chart ? (
        <>
          <svg
            className="nm-chart__svg"
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            preserveAspectRatio="none"
            role="img"
            aria-label="Gráfico de entradas e saídas diárias com saldo acumulado"
          >
            {/* Barras */}
            {chart.bars.map((b, i) => (
              <g key={i}>
                <rect
                  x={b.entX}
                  y={b.entY}
                  width={b.barW}
                  height={b.entH}
                  rx={1.5}
                  fill={COR_ENTRADA}
                />
                <rect
                  x={b.saiX}
                  y={b.saiY}
                  width={b.barW}
                  height={b.saiH}
                  rx={1.5}
                  fill={COR_SAIDA}
                />
              </g>
            ))}
            {/* Linha de saldo */}
            <path
              d={chart.linePath}
              fill="none"
              stroke={COR_SALDO}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <div className="nm-chart__axis">
            <span>{fD(chart.primeiraData)}</span>
            <span>Méd. diária {fN(chart.mediaDiaria)} L</span>
            <span>{fD(chart.ultimaData)}</span>
          </div>
        </>
      ) : (
        <Typography.Body>Sem movimentações no período.</Typography.Body>
      )}
    </section>
  );
};

export default InboundOutboundChart;
