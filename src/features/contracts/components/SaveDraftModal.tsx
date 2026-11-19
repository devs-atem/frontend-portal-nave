import type { ReactNode } from "react";
import { Button, Icon, Modal, type IconName } from "@devs-atem/design-system";

import {
  FIXED_ACCOUNTING_MEASURE,
  formatDate,
  formatQty,
  type ItemForm,
} from "../services/contractRules";
import "./SaveDraftModal.css";

export interface SaveDraftItem {
  item: ItemForm;
  /** Nome do produto (do catálogo). */
  name: string;
}

interface SaveDraftModalProps {
  mode: "create" | "edit";
  internalCode: string;
  contractNumber: string;
  /** Texto da base (ex.: "C001 — Base C001"). */
  baseText: string;
  /** Datas ISO da vigência do contrato. */
  effectiveFrom: string;
  effectiveTo?: string;
  attachment: File | null;
  items: SaveDraftItem[];
  saving: boolean;
  /** Erro do último envio (exibido no modal; o modal permanece aberto). */
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

interface CellData {
  title: string;
  value: ReactNode;
  icon?: IconName;
  /** Ocupa as 3 colunas restantes da linha. */
  span3?: boolean;
}

const COLUMNS = 4;

/**
 * Grade de 4 colunas com divisórias só entre as células (sem borda externa): a divisória
 * vertical some no fim de cada linha e a horizontal some na última linha.
 */
const Cells = ({ cells }: { cells: CellData[] }) => {
  const positioned = cells.reduce<{ c: CellData; at: number; span: number }[]>((acc, c) => {
    const prev = acc[acc.length - 1];
    const at = prev ? prev.at + prev.span : 0;
    return [...acc, { c, at, span: c.span3 ? 3 : 1 }];
  }, []);
  const last = positioned[positioned.length - 1];
  const total = last ? last.at + last.span : 0;
  const lastRowStart = Math.floor((total - 1) / COLUMNS) * COLUMNS;

  return (
    <dl className="nm-save-draft__cells">
      {positioned.map(({ c, at, span }) => {
        const endsRow = (at + span) % COLUMNS === 0;
        const isLast = at + span >= total;
        const classes = [
          "nm-save-draft__cell",
          c.span3 ? "nm-save-draft__cell--span-3" : "",
          !endsRow && !isLast ? "nm-save-draft__cell--right" : "",
          at < lastRowStart ? "nm-save-draft__cell--bottom" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <div key={c.title} className={classes}>
            {c.icon && (
              <span className="nm-save-draft__cell-icon">
                <Icon name={c.icon} size="md" color="inherit" aria-hidden />
              </span>
            )}
            <div>
              <dt>{c.title}</dt>
              <dd>{c.value}</dd>
            </div>
          </div>
        );
      })}
    </dl>
  );
};

const Short = ({ icon, label, value }: { icon: IconName; label: string; value: string }) => (
  <div className="nm-save-draft__short">
    <span className="nm-save-draft__short-icon">
      <Icon name={icon} size="md" color="inherit" aria-hidden />
    </span>
    <div className="nm-save-draft__short-text">
      <span className="nm-save-draft__short-label">{label}</span>
      <span className="nm-save-draft__short-value">{value}</span>
    </div>
  </div>
);

const SectionHead = ({ icon, children }: { icon: IconName; children: ReactNode }) => (
  <h3 className="nm-save-draft__section-head">
    <span className="nm-save-draft__tile nm-save-draft__tile--sm">
      <Icon name={icon} size="md" color="inherit" aria-hidden />
    </span>
    {children}
  </h3>
);

const formatSize = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Ilustração decorativa: documento com caneta e selo de confirmação. */
const Illustration = () => (
  <svg className="nm-save-draft__art" viewBox="0 0 140 130" aria-hidden="true" focusable="false">
    <rect x="14" y="22" width="78" height="96" rx="12" fill="#ffffff" opacity="0.22" />
    <rect x="26" y="12" width="78" height="96" rx="12" fill="#e8ecff" />
    <rect x="40" y="34" width="46" height="6" rx="3" fill="#9aa8ee" />
    <rect x="40" y="48" width="38" height="6" rx="3" fill="#b7c1f3" />
    <rect x="40" y="62" width="44" height="6" rx="3" fill="#b7c1f3" />
    <rect x="40" y="76" width="30" height="6" rx="3" fill="#cdd4f7" />
    <g transform="rotate(38 108 38)">
      <rect x="102" y="4" width="12" height="52" rx="3" fill="#7d8df0" />
      <path d="M102 56h12l-6 14z" fill="#f4d7b0" />
      <rect x="102" y="4" width="12" height="8" rx="3" fill="#c9d1fa" />
    </g>
    <circle cx="96" cy="96" r="20" fill="#5b6ff0" stroke="#e8ecff" strokeWidth="4" />
    <path
      d="M86 96l7 7 12-14"
      fill="none"
      stroke="#ffffff"
      strokeWidth="5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Onda decorativa no pé da coluna escura. */
const Wave = () => (
  <svg
    className="nm-save-draft__wave"
    viewBox="0 0 240 120"
    preserveAspectRatio="none"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M0 70c40-30 80 10 120-6s70-44 120-18v74H0z" fill="#ffffff" opacity="0.08" />
    <path d="M0 92c50-24 90 12 130-4s70-30 110-8v40H0z" fill="#ffffff" opacity="0.1" />
  </svg>
);

/**
 * Confirmação antes de salvar o rascunho. Painel de altura total com 60% da largura e
 * fundo desfocado, dividido em 20% (coluna azul escura com resumo curto) e 80% (coluna
 * branca com todos os detalhes do contrato e dos itens marcados).
 */
export const SaveDraftModal = ({
  mode,
  internalCode,
  contractNumber,
  baseText,
  effectiveFrom,
  effectiveTo,
  attachment,
  items,
  saving,
  error,
  onConfirm,
  onClose,
}: SaveDraftModalProps) => {
  const close = () => {
    if (!saving) onClose();
  };
  const action = mode === "create" ? "Criar rascunho" : "Salvar rascunho";

  return (
    <Modal
      open
      onClose={close}
      size="full"
      className="nm-save-draft__panel"
      overlayClassName="nm-save-draft__overlay"
    >
      <div className="nm-save-draft__layout">
        <aside className="nm-save-draft__aside" aria-label="Resumo">
          <Illustration />
          <h2 className="nm-save-draft__aside-title">Confirmar rascunho</h2>
          <p className="nm-save-draft__aside-subtitle">
            Revise os dados do contrato antes de salvar.
          </p>
          <div className="nm-save-draft__shorts">
            <Short icon="FileText" label="Situação" value="Rascunho" />
            <Short icon="Layers" label="Contrato" value={contractNumber || "—"} />
            <Short icon="Database" label="Base" value={baseText.split(" — ")[0] || "—"} />
            <Short icon="Package" label="Itens" value={String(items.length)} />
          </div>
          <Wave />
        </aside>

        <div className="nm-save-draft__main">
          <div className="nm-save-draft__header">
            <span className="nm-save-draft__tile">
              <Icon name="FileText" size="lg" color="inherit" aria-hidden />
            </span>
            <div className="nm-save-draft__header-text">
              <h2 className="nm-save-draft__title">Confirmar rascunho</h2>
              <p className="nm-save-draft__subtitle">
                Revise os dados do contrato antes de salvar.
              </p>
            </div>
            <button
              type="button"
              className="nm-save-draft__close"
              onClick={close}
              disabled={saving}
              aria-label="Fechar"
            >
              <Icon name="X" size="md" color="inherit" aria-hidden />
            </button>
          </div>

          <div className="nm-save-draft__body">
            <section>
              <SectionHead icon="FileText">Dados gerais</SectionHead>
              <div className="nm-save-draft__card nm-save-draft__card--tinted">
                <Cells
                  cells={[
                    { title: "Código interno", value: internalCode || "—", icon: "Barcode" },
                    { title: "Número do contrato", value: contractNumber || "—", icon: "FileText" },
                    { title: "Base", value: baseText || "—", icon: "Layers" },
                    {
                      title: "Início da vigência",
                      value: formatDate(effectiveFrom),
                      icon: "Calendar",
                    },
                    {
                      title: "Fim da vigência",
                      value: formatDate(effectiveTo, "Indeterminada"),
                      icon: "Calendar",
                    },
                    { title: "Depositante", value: "Padrão do sistema", icon: "User" },
                    {
                      title: "Anexo",
                      value: attachment
                        ? `${attachment.name} (${formatSize(attachment.size)})`
                        : "Nenhum",
                      icon: "Paperclip",
                    },
                  ]}
                />
              </div>
            </section>

            <section>
              <SectionHead icon="Package">Itens do contrato ({items.length})</SectionHead>
              {items.length === 0 ? (
                <span className="nm-save-draft__muted">
                  Nenhum item marcado. O contrato será salvo sem itens e poderá recebê-los depois,
                  na edição do rascunho.
                </span>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {items.map(({ item, name }) => (
                    <article key={item.key} className="nm-save-draft__card">
                      <div className="nm-save-draft__item-head">
                        <span className="nm-save-draft__tile">
                          <Icon name="Fuel" size="lg" color="inherit" aria-hidden />
                        </span>
                        <div>
                          <h4 className="nm-save-draft__item-name">{name}</h4>
                          <span className="nm-save-draft__item-code">({item.productCode})</span>
                        </div>
                      </div>
                      <Cells
                        cells={[
                          { title: "Medida contábil", value: FIXED_ACCOUNTING_MEASURE },
                          {
                            title: "Capacidade reservada",
                            value: formatQty(item.reservedCapacity),
                          },
                          { title: "Capacidade máxima", value: formatQty(item.maximumCapacity) },
                          {
                            title: "Cota mínima",
                            value: formatQty(item.minimumQuota || undefined),
                          },
                          { title: "Cota máxima", value: formatQty(item.maximumQuota) },
                          {
                            title: "Estoque mínimo",
                            value: formatQty(item.minimumStock || undefined),
                          },
                          {
                            title: "Limite de movimentação",
                            value: formatQty(item.movementLimit || undefined),
                          },
                          {
                            title: "Tolerância de quantidade (%)",
                            value: formatQty(item.movementQuantityTolerancePercent || undefined),
                          },
                          {
                            title: "Alerta de cota (%)",
                            value: formatQty(item.quotaAlertPercent || undefined),
                          },
                          {
                            title: "Tipos de movimento",
                            span3: true,
                            value: (
                              <span className="nm-save-draft__chips">
                                {item.allowedMovementTypeCodes.length === 0
                                  ? "—"
                                  : item.allowedMovementTypeCodes.map((code) => (
                                      <span key={code} className="nm-save-draft__chip">
                                        <Icon
                                          name={code === "SAIDA" ? "ArrowLeft" : "ArrowRight"}
                                          size="xs"
                                          color="inherit"
                                          aria-hidden
                                        />
                                        {code}
                                      </span>
                                    ))}
                              </span>
                            ),
                          },
                        ]}
                      />
                    </article>
                  ))}
                </div>
              )}
            </section>

            {error && (
              <p role="alert" className="nm-save-draft__error">
                {error}
              </p>
            )}
          </div>

          <div className="nm-save-draft__footer">
            <Button variant="outlined" onClick={close} disabled={saving}>
              <span className="nm-save-draft__btn-content">
                <Icon name="ArrowLeft" size="sm" color="inherit" aria-hidden /> Voltar
              </span>
            </Button>
            <Button variant="contained" onClick={onConfirm} loading={saving} disabled={saving}>
              <span className="nm-save-draft__btn-content">
                <Icon name="Check" size="sm" color="inherit" aria-hidden /> {action}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SaveDraftModal;
