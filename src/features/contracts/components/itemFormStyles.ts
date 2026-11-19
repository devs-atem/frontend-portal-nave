import type { CSSProperties } from "react";

export const label: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#3D4556",
  display: "flex",
  flexDirection: "column",
  gap: 5,
};
export const hint: CSSProperties = { fontSize: 12, color: "#5B6475", fontWeight: 400 };
export const errorText: CSSProperties = { color: "#B42F2F", fontWeight: 400, fontSize: 12 };
export const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,200px),1fr))",
  gap: 12,
};
