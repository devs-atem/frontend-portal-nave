interface BarMeterProps {
  label: string;
  /** 0..1 */
  ratio: number;
  value: string;
  color?: string;
}

/** Barra horizontal proporcional (saldo por produto, capacidade, etc.). */
export const BarMeter = ({ label, ratio, value, color = "#0D265E" }: BarMeterProps) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "minmax(120px,170px) 1fr auto",
      gap: 12,
      alignItems: "center",
      fontSize: 13,
    }}
  >
    <span>{label}</span>
    <div style={{ height: 14, background: "#F1F3F7", borderRadius: 4, overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${Math.min(100, Math.max(0, ratio * 100)).toFixed(1)}%`,
          background: color,
          borderRadius: 4,
        }}
      />
    </div>
    <span style={{ fontVariantNumeric: "tabular-nums", minWidth: 110, textAlign: "right", color: "#3D4556" }}>
      {value}
    </span>
  </div>
);

export default BarMeter;
