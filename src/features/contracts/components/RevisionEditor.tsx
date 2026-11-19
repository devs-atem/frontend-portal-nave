import { DateField } from "@shared/components/DateField";
import type { RevisionForm, ValidationErrors } from "../services/contractRules";
import { errorText, grid, label } from "./itemFormStyles";
import { ItemsPanel, type ProductChoice } from "./ItemsPanel";

export type { ProductChoice };

interface RevisionEditorProps {
  value: RevisionForm;
  onChange: (v: RevisionForm) => void;
  errors: ValidationErrors;
  productChoices: ProductChoice[];
  /** Nova revisão exige justificativa. */
  requireJustification?: boolean;
  /** Só a lista de itens: vigência e justificativa da revisão ficam ocultas (formulário de contrato). */
  itemsOnly?: boolean;
  disabled?: boolean;
}

/**
 * Editor da revisão: vigência, justificativa e lista de itens. É reaproveitado
 * pelo formulário de contrato (rascunho) e pela nova revisão. Pool, tanques e
 * dados do produto do cliente não são editados aqui (HRZ-373): o backend usa o
 * pool padrão da base e a medida contábil é fixa em GSV.
 */
export const RevisionEditor = ({
  value,
  onChange,
  errors,
  productChoices,
  requireJustification,
  itemsOnly,
  disabled,
}: RevisionEditorProps) => {
  const setRev = (patch: Partial<RevisionForm>) => onChange({ ...value, ...patch });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {!itemsOnly && (
        <>
          <div style={grid}>
            <div style={label}>
              Início da revisão *
              <DateField
                ariaLabel="Início da revisão"
                value={value.effectiveFrom}
                onChange={(v) => setRev({ effectiveFrom: v })}
                error={!!errors["rev.effectiveFrom"]}
                disabled={disabled}
              />
              {errors["rev.effectiveFrom"] && (
                <span style={errorText}>{errors["rev.effectiveFrom"]}</span>
              )}
            </div>
            <div style={label}>
              Fim da revisão (vazio = indeterminado)
              <DateField
                ariaLabel="Fim da revisão"
                value={value.effectiveUntil}
                onChange={(v) => setRev({ effectiveUntil: v })}
                error={!!errors["rev.effectiveUntil"]}
                disabled={disabled}
                min={value.effectiveFrom || undefined}
                align="end"
              />
              {errors["rev.effectiveUntil"] && (
                <span style={errorText}>{errors["rev.effectiveUntil"]}</span>
              )}
            </div>
          </div>

          <label style={label}>
            Justificativa{requireJustification ? " *" : " (opcional)"}
            <textarea
              value={value.justification}
              onChange={(e) => setRev({ justification: e.target.value })}
              rows={2}
              disabled={disabled}
              style={{
                border: `1px solid ${errors["rev.justification"] ? "#B42F2F" : "#E2E6EE"}`,
                borderRadius: 8,
                padding: 8,
                font: "inherit",
                fontWeight: 400,
                resize: "vertical",
              }}
            />
            {errors["rev.justification"] && (
              <span style={errorText}>{errors["rev.justification"]}</span>
            )}
          </label>
        </>
      )}

      {errors["rev.items"] && <span style={errorText}>{errors["rev.items"]}</span>}

      <ItemsPanel
        items={value.items}
        onChange={(items) => setRev({ items })}
        errors={errors}
        productChoices={productChoices}
        disabled={disabled}
      />
    </div>
  );
};
