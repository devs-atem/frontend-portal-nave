import type { CSSProperties } from "react";
import { Skeleton } from "@devs-atem/design-system";

import { BREAKPOINTS, useMediaQuery } from "@shared/hooks/useMediaQuery";
import type { ContractFormMode } from "../pages/ContractFormPage";

const INPUT_HEIGHT = 44;

const card: CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E2E6EE",
  borderRadius: 12,
  padding: "18px 20px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

/** Rótulo + campo de entrada, como no formulário real. */
const Field = ({
  labelWidth = 90,
  height = INPUT_HEIGHT,
}: {
  labelWidth?: number;
  height?: number;
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
    <Skeleton variant="text" width={labelWidth} height={12} />
    <Skeleton variant="rounded" width="100%" height={height} />
  </div>
);

const SectionHeading = ({
  titleWidth,
  subtitleWidth,
}: {
  titleWidth: number;
  subtitleWidth?: number;
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <Skeleton variant="rounded" width={32} height={32} />
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Skeleton variant="text" width={titleWidth} height={16} />
      {subtitleWidth && <Skeleton variant="text" width={subtitleWidth} height={12} />}
    </div>
  </div>
);

/** Dados gerais: campos em 3 colunas | área de anexo com divisória. */
const GeneralDataSkeleton = ({ stacked }: { stacked: boolean }) => (
  <div style={card}>
    <SectionHeading titleWidth={110} subtitleWidth={380} />
    <div
      style={{
        display: "grid",
        gridTemplateColumns: stacked ? "1fr" : "minmax(0, 3fr) minmax(0, 2fr)",
        gap: 20,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: stacked
            ? "repeat(auto-fit, minmax(min(100%, 220px), 1fr))"
            : "repeat(3, minmax(0, 1fr))",
          gap: 14,
          alignContent: "start",
        }}
      >
        <Field labelWidth={90} />
        <Field labelWidth={120} />
        <Field labelWidth={50} />
        <Field labelWidth={110} />
        <Field labelWidth={150} />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          ...(stacked
            ? { borderTop: "1px solid #E2E6EE", paddingTop: 14 }
            : { borderLeft: "1px solid #E2E6EE", paddingLeft: 20 }),
        }}
      >
        <Skeleton variant="text" width={160} height={12} />
        <Skeleton variant="rounded" width="100%" height={129} />
      </div>
    </div>
  </div>
);

/** Nova revisão: vigência e justificativa no lugar dos dados gerais. */
const RevisionDataSkeleton = () => (
  <div style={card}>
    <SectionHeading titleWidth={80} />
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,200px),1fr))",
        gap: 12,
      }}
    >
      <Field labelWidth={110} />
      <Field labelWidth={170} />
    </div>
    <Field labelWidth={100} height={64} />
  </div>
);

/** Itens: cabeçalho, lista de cards à esquerda e detalhe com abas à direita. */
const ItemsSkeleton = ({ stacked }: { stacked: boolean }) => (
  <div style={card}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Skeleton variant="rounded" width={40} height={40} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Skeleton variant="text" width={150} height={18} />
        <Skeleton variant="text" width={340} height={12} />
      </div>
    </div>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: stacked ? "minmax(0, 1fr)" : "260px minmax(0, 1fr)",
        gap: 20,
        alignItems: "start",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Skeleton variant="rounded" width="100%" height={INPUT_HEIGHT} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" width="100%" height={50} />
          ))}
        </div>
      </div>

      <div
        style={{
          border: "1px solid #E2E6EE",
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
          <Skeleton variant="rounded" width={36} height={36} />
          <Skeleton variant="text" width={200} height={18} />
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", gap: 16, padding: "4px 18px 18px" }}
        >
          <div style={{ display: "flex", gap: 24 }}>
            <Skeleton variant="text" width={110} height={16} />
            <Skeleton variant="text" width={150} height={16} />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: stacked ? "1fr" : "minmax(0, 2fr) minmax(0, 1fr)",
              gap: 14,
            }}
          >
            <Field labelWidth={60} />
            <Field labelWidth={100} />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${stacked ? 2 : 5}, minmax(0, 1fr))`,
              gap: 14,
            }}
          >
            {[130, 120, 90, 100, 110].map((w, i) => (
              <Field key={i} labelWidth={w} />
            ))}
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}
          >
            <Field labelWidth={110} />
            <Field labelWidth={170} />
          </div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * Esqueleto do formulário de contrato, no mesmo desenho da tela: título, dados gerais
 * (campos | anexo) e itens (lista + detalhe). Na nova revisão troca os dados gerais
 * pela vigência e justificativa.
 */
export const ContractFormSkeleton = ({ mode }: { mode: ContractFormMode }) => {
  const stacked = useMediaQuery(BREAKPOINTS.tablet);
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Carregando formulário"
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "4px 0" }}>
        <Skeleton variant="text" width={220} height={28} />
        <Skeleton variant="text" width={420} height={14} />
      </div>
      {mode === "revision" ? <RevisionDataSkeleton /> : <GeneralDataSkeleton stacked={stacked} />}
      <ItemsSkeleton stacked={stacked} />
    </div>
  );
};

export default ContractFormSkeleton;
