import { useState, type CSSProperties } from "react";
import { Button, Modal, Select } from "@devs-atem/design-system";

import {
  CONTRACT_ACTION_LABEL,
  type ContractAction,
  type ContractActionRequest,
  type StockDeclaration,
} from "../services/contract";
import { contractErrorMessage } from "../services/contractErrors";

const label: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#3D4556",
  display: "flex",
  flexDirection: "column",
  gap: 5,
};
const hint: CSSProperties = { fontSize: 12, color: "#5B6475", fontWeight: 400 };
const errorText: CSSProperties = { color: "#B42F2F", fontWeight: 400, fontSize: 12 };

const DECLARATION_LABEL: Record<StockDeclaration, string> = {
  ZERO: "Estoque zero",
  PREEXISTING_STOCK: "Estoque preexistente",
};

interface ActionModalProps {
  action: ContractAction;
  onClose: () => void;
  /** Deve lançar em caso de falha; a mensagem é exibida no modal. */
  onConfirm: (body: ContractActionRequest) => Promise<void>;
}

/**
 * Modal das ações de status. `justification` é obrigatória em todas as
 * transições, exceto `submit`. No `approve`, oferece a declaração de estoque
 * (obrigatória quando a base já passou por cutover).
 */
export const ActionModal = ({ action, onClose, onConfirm }: ActionModalProps) => {
  const [justification, setJustification] = useState("");
  const [declaration, setDeclaration] = useState<StockDeclaration | "">("");
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const justificationRequired = action !== "submit";

  const submit = async () => {
    if (justificationRequired && !justification.trim()) {
      setFieldError("Informe a justificativa.");
      return;
    }
    setSaving(true);
    setSubmitError(null);
    try {
      await onConfirm({
        justification: justification.trim() || undefined,
        stockDeclaration: declaration || undefined,
      });
    } catch (err) {
      setSubmitError(contractErrorMessage(err, "Não foi possível concluir a ação."));
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    if (!saving) onClose();
  };

  const labelOf = (v: string): string =>
    v ? DECLARATION_LABEL[v as StockDeclaration] : "Não informar";

  return (
    <Modal open onClose={close} size="md">
      <Modal.Header title={CONTRACT_ACTION_LABEL[action]} onClose={close} />
      <Modal.Body>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={label}>
            Justificativa{justificationRequired ? " *" : " (opcional)"}
            <textarea
              value={justification}
              onChange={(e) => {
                setJustification(e.target.value);
                setFieldError(null);
              }}
              rows={4}
              disabled={saving}
              style={{
                border: `1px solid ${fieldError ? "#B42F2F" : "#E2E6EE"}`,
                borderRadius: 8,
                padding: 8,
                font: "inherit",
                fontWeight: 400,
                resize: "vertical",
              }}
            />
            {fieldError && <span style={errorText}>{fieldError}</span>}
          </label>

          {action === "approve" && (
            <div style={label}>
              Declaração de estoque
              <Select<string>
                size="sm"
                value={declaration}
                options={["", "ZERO", "PREEXISTING_STOCK"].map((option) => ({ option }))}
                getOptionItemLabel={labelOf}
                getSelectedOptionLabel={labelOf}
                getOptionKey={(v) => v || "__none"}
                onChange={(v) => setDeclaration(v as StockDeclaration | "")}
                disabled={saving}
              />
              <span style={hint}>
                Obrigatória quando a base já passou por cutover (saldo inicial ativo).
              </span>
            </div>
          )}

          {action === "close" && (
            <span style={hint}>
              O encerramento é bloqueado se houver saldo ou posição de custódia diferente de zero.
            </span>
          )}

          {submitError && (
            <span role="alert" style={{ ...errorText, fontWeight: 600 }}>
              {submitError}
            </span>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outlined" onClick={close} disabled={saving}>
          Voltar
        </Button>
        <Button
          variant="contained"
          color={action === "cancel" ? "error" : undefined}
          onClick={submit}
          loading={saving}
          disabled={saving}
        >
          {CONTRACT_ACTION_LABEL[action]}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
