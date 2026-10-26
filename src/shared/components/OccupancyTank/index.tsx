interface OccupancyTankProps {
  /** 0..1 */
  ratio: number;
  color?: string;
  width?: number;
  height?: number;
  /** Desenha gradeado interno (estilo "tanque de medição"). */
  gauge?: boolean;
}

/** Representação visual de um tanque com nível proporcional (CSS puro). */
export const OccupancyTank = ({
  ratio,
  color = "#0D265E",
  width = 44,
  height = 84,
  gauge = false,
}: OccupancyTankProps) => {
  const pct = `${Math.min(100, Math.max(0, ratio * 100)).toFixed(1)}%`;
  const low = ratio < 0.15;
  const fill = low ? "#D64545" : color;
  return (
    <div
      aria-hidden
      style={{
        width,
        height,
        border: "2px solid #C3CAD6",
        borderRadius: "8px 8px 6px 6px",
        position: "relative",
        overflow: "hidden",
        background: gauge
          ? "repeating-linear-gradient(0deg,#F5F7FA 0 21px,#E7EAF0 21px 22px)"
          : "#F5F7FA",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: pct,
          background: fill,
          opacity: 0.92,
        }}
      />
    </div>
  );
};

export default OccupancyTank;
