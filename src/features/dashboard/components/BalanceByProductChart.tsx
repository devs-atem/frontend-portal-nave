import { Typography } from "@devs-atem/design-system";

import { BarMeter } from "@shared/components/BarMeter";
import { fN } from "@shared/domain";

export interface SaldoProdutoItem {
  produtoId: number;
  litros: number;
}

interface BalanceByProductChartProps {
  dados: SaldoProdutoItem[];
  /** Resolve o nome do produto a partir do id. */
  nomeProduto: (produtoId: number) => string;
  /** Resolve a cor do produto a partir do id. */
  corProduto: (produtoId: number) => string;
}

/**
 * Gráfico de barras horizontais do saldo disponível por produto.
 * Recebe os dados já agregados — não acessa IoC nem contexto, só renderiza.
 */
export const BalanceByProductChart = ({
  dados,
  nomeProduto,
  corProduto,
}: BalanceByProductChartProps) => {
  const max = Math.max(1, ...dados.map((d) => d.litros));

  return (
    <section className="nm-chart">
      <Typography.H4>Saldo disponível por produto</Typography.H4>
      <div className="nm-chart__bars">
        {dados.map((d) => (
          <BarMeter
            key={d.produtoId}
            label={nomeProduto(d.produtoId)}
            ratio={d.litros / max}
            value={`${fN(d.litros)} L`}
            color={corProduto(d.produtoId)}
          />
        ))}
      </div>
    </section>
  );
};

export default BalanceByProductChart;
